import DeviceMonitorService from './DeviceMonitorService'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import {
  anyEntityUpdate,
  entityReported,
  entityStateRequest,
  entityUpdate,
  notifications,
} from '../../events/events'
import Entities from '../../configs/entities.config'
import { pingHost } from '../../utils/pingHost'
import { createLogger } from '../../logging/logger'
import devices from '../../configs/deviceMonitor.config'
import { homeAssistantSync } from '../../events/events'

jest.mock('../../utils/pingHost')
jest.mock('../../logging/logger', () => ({
  createLogger: jest.fn(() => ({ error: jest.fn() })),
}))

const pingMock = jest.mocked(pingHost)
const loggerCall = jest
  .mocked(createLogger)
  .mock.calls.findIndex(([scope]) => scope === 'DeviceMonitorService')
const logger = jest.mocked(createLogger).mock.results[loggerCall].value
const readMqttLastReport = jest.fn<Promise<string | undefined>, [string]>()
const twoHours = 2 * 60 * 60 * 1000

jest.mock('../../configs/deviceMonitor.config', () => [
  {
    monitoring: 'entity',
    entityId: 'important1',
    name: 'name1',
    maxHoursWithoutUpdate: 3,
  },
  {
    monitoring: 'entity',
    entityId: 'important2',
    name: 'name2',
    maxHoursWithoutUpdate: 3,
  },
  { monitoring: 'entity', entityId: 'important3', name: 'name3' },
  {
    monitoring: 'ping',
    entityId: 'dashNode',
    name: 'Dash node',
    ipAddress: '192.168.1.5',
    intervalHours: 2,
  },
])

const emitTestEntityUpdates = () => {
  const emit = (id: string, battery: number, state = battery.toString()) =>
    emitStateUpdate(`sensor.${id}_battery`, state, {
      friendly_name: `${id}_name Battery`,
    })
  emit('standard1', 100)
  emit('standard2', 40)
  emit('standard3', 30)
  emit('standard4', 15)
  emit('standard6', 5)
  emit('standard6', 100)
  emit('standard7', 100, 'unavailable')
  emit('standard7', 5, 'unavailable')
  emit('important1', 10)
  emit('important2', 60)
  emitStateUpdate('important2', 'unknown')
}

describe('Device monitor service', () => {
  beforeEach(() => {
    pingMock.mockReset().mockResolvedValue(true)
    readMqttLastReport.mockReset().mockResolvedValue(undefined)
    logger.error.mockClear()
    jest.useFakeTimers().setSystemTime(new Date('2026-09-05T12:00:00Z'))
    anyEntityUpdate.resetListeners()
    entityReported.resetListeners()
    entityStateRequest.resetListeners()
    entityUpdate(
      Entities.inputBoolean.system.alertBatteryLevel,
    ).resetListeners()
    entityUpdate(
      Entities.inputBoolean.system.alertSelfDiagnostic,
    ).resetListeners()
    notifications.resetListeners()
    mockEntity(Entities.inputBoolean.system.alertBatteryLevel, 'on')
    mockEntity(Entities.inputBoolean.system.alertSelfDiagnostic, 'on')
    mockEntity('important1', '21.5')
    mockEntity('important2', '22.5')
    mockEntity('important3', 'off')
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('should initialize service with correct status', () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Offline: 0; No update: 0; On watchlist: 4',
      color: 'green',
    })
  })

  it('reports an already unavailable sensor immediately at startup', () => {
    mockEntity('important3', 'unavailable')
    const service = new DeviceMonitorService(readMqttLastReport)
    expect(service.detectedDevices).toContainEqual(
      expect.objectContaining({
        entityId: 'important3',
        offline: true,
        offlineReason: 'unavailable',
      }),
    )
  })

  it('checks cached state again after HA reconnects', () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    mockEntity('important3', 'unavailable')
    homeAssistantSync.emit({ entitiesCount: 3 })
    expect(service.detectedDevices).toContainEqual(
      expect.objectContaining({
        entityId: 'important3',
        offline: true,
      }),
    )
  })

  describe('MQTT report monitoring', () => {
    const entityId = 'binary_sensor.leak'
    const hour = 60 * 60 * 1000
    const advanceHours = async (hours: number) => {
      for (let i = 0; i < hours; i += 1) {
        jest.advanceTimersByTime(hour)
        await Promise.resolve()
      }
    }
    beforeEach(() => {
      devices.push({
        monitoring: 'entity',
        entityId,
        name: 'Water filter',
        maxHoursWithoutUpdate: 3,
        reportSource: 'mqtt',
      })
      entityStateRequest.on(({ entityId: requested, callback }) => {
        if (requested === entityId)
          callback({
            id: entityId,
            state: 'off',
            attributes: {},
            lastChanged: '2026-01-01T00:00:00Z',
            lastUpdated: '2026-01-01T00:00:00Z',
            lastReported: '2026-01-01T00:00:00Z',
          })
      })
    })
    afterEach(() => {
      devices.pop()
    })

    it('keeps an unchanged HA entity healthy while MQTT reports continue, then alerts and recovers', async () => {
      let lastReport = new Date().toISOString()
      readMqttLastReport.mockImplementation(async () => lastReport)
      const service = new DeviceMonitorService(readMqttLastReport)
      const listener = jest.fn()
      notifications.on(listener)
      await Promise.resolve()
      for (let i = 0; i < 4; i += 1) {
        lastReport = new Date(Date.now() + hour).toISOString()
        await advanceHours(1)
        expect(
          service.detectedDevices.find((d) => d.entityId === entityId),
        ).toBeUndefined()
      }
      await advanceHours(3)
      expect(service.detectedDevices).toContainEqual(
        expect.objectContaining({
          entityId,
          noUpdate: true,
          hoursSinceLastReport: 3,
        }),
      )
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'noSensorUpdate',
          enabled: true,
          payload: {
            devices: expect.arrayContaining([
              { name: 'Water filter', hoursSinceLastReport: 3 },
            ]),
          },
        }),
      )
      // Even a fresh HA timestamp is not proof of MQTT communication.
      emitStateUpdate(entityId, 'off')
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId)?.noUpdate,
      ).toBe(true)
      lastReport = new Date().toISOString()
      await advanceHours(1)
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId),
      ).toBeUndefined()
    })

    it('detects an old MQTT report immediately after a backend restart', async () => {
      readMqttLastReport.mockResolvedValue('2026-09-05T08:00:00Z')
      const service = new DeviceMonitorService(readMqttLastReport)
      await Promise.resolve()
      expect(service.detectedDevices).toContainEqual(
        expect.objectContaining({
          entityId,
          noUpdate: true,
          hoursSinceLastReport: 4,
        }),
      )
    })

    it('does not ignore a sensor whose MQTT history is empty, or reset its timer on each poll', async () => {
      const service = new DeviceMonitorService(readMqttLastReport)
      await Promise.resolve()
      await advanceHours(2)
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId),
      ).toBeUndefined()
      await advanceHours(1)
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId),
      ).toMatchObject({ noUpdate: true })
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId)
          ?.hoursSinceLastReport,
      ).toBeUndefined()
    })

    it('preserves the last report through API errors, empty history and reconnects', async () => {
      readMqttLastReport.mockResolvedValue(new Date().toISOString())
      const service = new DeviceMonitorService(readMqttLastReport)
      await Promise.resolve()
      readMqttLastReport.mockRejectedValue(new Error('HA unavailable'))
      await advanceHours(3)
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId),
      ).toMatchObject({
        noUpdate: true,
        hoursSinceLastReport: 3,
      })
      expect(logger.error).toHaveBeenCalledWith(
        'Unable to read MQTT device activity',
        expect.objectContaining({ entityId }),
      )
      readMqttLastReport.mockResolvedValue(undefined)
      homeAssistantSync.emit({ entitiesCount: 4 })
      await Promise.resolve()
      await advanceHours(1)
      expect(
        service.detectedDevices.find((d) => d.entityId === entityId),
      ).toMatchObject({
        noUpdate: true,
        hoursSinceLastReport: 4,
      })
    })

    it('does not overlap reads while an earlier MQTT request is pending', async () => {
      let resolve!: (value: string | undefined) => void
      readMqttLastReport.mockReturnValueOnce(
        new Promise((done) => {
          resolve = done
        }),
      )
      new DeviceMonitorService(readMqttLastReport)
      await advanceHours(2)
      expect(readMqttLastReport).toHaveBeenCalledTimes(1)
      resolve(new Date().toISOString())
      await Promise.resolve()
      await advanceHours(1)
      expect(readMqttLastReport).toHaveBeenCalledTimes(2)
    })
  })

  it('should trigger low battery notification', () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('sensor.remote_battery', '12', {
      friendly_name: 'Living room remote Battery',
    })

    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 1; Offline: 0; No update: 0; On watchlist: 4',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      payload: {
        devices: [{ name: 'Living room remote', batteryPercentage: 12 }],
      },
    })
  })

  it('updates percentages while a battery remains low and clears the alert after recovery', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    const updateBattery = (value: string) =>
      emitStateUpdate('sensor.remote_battery', value, {
        friendly_name: 'Remote Battery',
      })
    updateBattery('31')
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lowBattery', enabled: true }),
    )
    updateBattery('30')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      payload: { devices: [{ name: 'Remote', batteryPercentage: 30 }] },
    })
    updateBattery('0')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      payload: { devices: [{ name: 'Remote', batteryPercentage: 0 }] },
    })
    notificationMock.mockClear()
    updateBattery('31')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: false,
      payload: undefined,
    })
  })

  it.each(['-1', '101', 'unknown', 'unavailable', '', 'NaN'])(
    'does not report an invalid battery percentage: %s',
    (value) => {
      new DeviceMonitorService(readMqttLastReport)
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      emitStateUpdate('sensor.remote_battery', value)
      expect(notificationMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lowBattery', enabled: true }),
      )
    },
  )

  it('distinguishes unavailable and unknown entity states', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important3', 'unavailable')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      payload: { devices: [{ name: 'name3', reason: 'unavailable' }] },
    })
    notificationMock.mockClear()
    emitStateUpdate('important3', 'unknown')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      payload: { devices: [{ name: 'name3', reason: 'unknown' }] },
    })
  })

  it('should trigger offline notification only for the watchlist', () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important3', 'unknown')

    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Offline: 1; No update: 0; On watchlist: 4',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      payload: { devices: [{ name: 'name3', reason: 'unknown' }] },
    })
  })

  it('should detect low batteries and monitored offline devices', () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    emitTestEntityUpdates()

    expect(service.detectedDevices).toEqual([
      {
        entityId: 'sensor.standard3_battery',
        name: 'standard3_name',
        batteryPercentage: 30,
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'sensor.standard4_battery',
        name: 'standard4_name',
        batteryPercentage: 15,
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'sensor.important1_battery',
        name: 'important1_name',
        batteryPercentage: 10,
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'important2',
        name: 'name2',
        offlineReason: 'unknown',
        lowBattery: false,
        offline: true,
        noUpdate: false,
        monitored: true,
      },
    ])
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 3; Offline: 1; No update: 0; On watchlist: 4',
      color: 'yellow',
    })
  })

  it('should not trigger notifications if alerts are disabled', () => {
    new DeviceMonitorService(readMqttLastReport)
    emitStateUpdate(Entities.inputBoolean.system.alertBatteryLevel, 'off')
    emitStateUpdate(Entities.inputBoolean.system.alertSelfDiagnostic, 'off')
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitTestEntityUpdates()

    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: false,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: false,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: false,
    })
  })

  it('should notify after three hours without a report', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5')
    notificationMock.mockClear()

    jest.advanceTimersByTime(3 * 60 * 60 * 1000 - 60 * 1000)
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'noSensorUpdate', enabled: true }),
    )
    jest.advanceTimersByTime(60 * 1000)
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: { devices: [{ name: 'name1', hoursSinceLastReport: 3 }] },
    })
  })

  it('updates the elapsed time while a sensor remains stale', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5')
    jest.advanceTimersByTime(3 * 60 * 60 * 1000)
    notificationMock.mockClear()
    jest.advanceTimersByTime(60 * 60 * 1000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: {
        devices: [
          { name: 'name1', hoursSinceLastReport: 4 },
          { name: 'name2', hoursSinceLastReport: 4 },
        ],
      },
    })
  })

  it('should treat an unchanged state report as device activity', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5')

    jest.advanceTimersByTime(2 * 60 * 60 * 1000)
    entityReported.emit({
      id: 'important1',
      state: '21.5',
      lastChanged: '2026-09-05T12:00:00Z',
      lastUpdated: '2026-09-05T12:00:00Z',
      lastReported: '2026-09-05T14:00:00Z',
      attributes: { friendly_name: 'Important sensor' },
    })
    notificationMock.mockClear()

    jest.advanceTimersByTime(2 * 60 * 60 * 1000)
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'noSensorUpdate',
        enabled: true,
        payload: {
          devices: expect.arrayContaining([
            expect.objectContaining({ name: 'name1' }),
          ]),
        },
      }),
    )
  })

  it('initializes monitoring from cached states and alerts without any subsequent update', () => {
    const cachedStateRequest = jest.fn()
    entityStateRequest.on(({ entityId, callback }) => {
      if (entityId === 'important1') {
        cachedStateRequest()
        callback({
          id: entityId,
          state: '21.5',
          lastChanged: '2026-09-05T08:00:00Z',
          lastUpdated: '2026-09-05T08:00:00Z',
          lastReported: '2026-09-05T11:30:00Z',
          attributes: {
            friendly_name: 'Important sensor',
          },
        })
      }
    })
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    const service = new DeviceMonitorService(readMqttLastReport)

    jest.advanceTimersByTime(4 * 60 * 60 * 1000)

    expect(cachedStateRequest).toHaveBeenCalled()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: {
        devices: [
          { name: 'name1', hoursSinceLastReport: 4 },
          { name: 'name2', hoursSinceLastReport: 4 },
        ],
      },
    })
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Offline: 0; No update: 2; On watchlist: 4',
      color: 'yellow',
    })
  })

  it('should update notification details as stale sensors recover', () => {
    new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5')
    emitStateUpdate('important2', '22.5')
    notificationMock.mockClear()

    jest.advanceTimersByTime(3 * 60 * 60 * 1000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: {
        devices: [
          { name: 'name1', hoursSinceLastReport: 3 },
          { name: 'name2', hoursSinceLastReport: 3 },
        ],
      },
    })

    emitStateUpdate('important1', '21.6')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: { devices: [{ name: 'name2', hoursSinceLastReport: 3 }] },
    })
  })

  it('should ping at startup without an entity report and every two hours', async () => {
    new DeviceMonitorService(readMqttLastReport)
    await Promise.resolve()
    expect(pingMock).toHaveBeenCalledTimes(1)
    expect(pingMock).toHaveBeenCalledWith('192.168.1.5')

    jest.advanceTimersByTime(twoHours - 1)
    expect(pingMock).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1)
    await Promise.resolve()
    expect(pingMock).toHaveBeenCalledTimes(2)
    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(pingMock).toHaveBeenCalledTimes(3)
  })

  it('should ignore stale and unavailable entity reports for a reachable LAN device', async () => {
    const service = new DeviceMonitorService(readMqttLastReport)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    await Promise.resolve()
    emitStateUpdate('dashNode', 'unavailable')
    entityReported.emit({
      id: 'dashNode',
      state: 'unknown',
      lastChanged: '2026-09-01T00:00:00Z',
      lastUpdated: '2026-09-01T00:00:00Z',
      lastReported: '2026-09-01T00:00:00Z',
      attributes: {},
    })
    jest.advanceTimersByTime(4 * 60 * 60 * 1000)
    await Promise.resolve()

    expect(service.detectedDevices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: 'dashNode' }),
      ]),
    )
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offlineSensor', enabled: true }),
    )
  })

  it('should report a failed ping and recover only after a successful ping', async () => {
    pingMock.mockResolvedValueOnce(false)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    const service = new DeviceMonitorService(readMqttLastReport)
    await Promise.resolve()

    expect(service.detectedDevices).toEqual([
      {
        entityId: 'dashNode',
        name: 'Dash node',
        offlineReason: 'pingFailed',
        lowBattery: false,
        offline: true,
        noUpdate: false,
        monitored: true,
      },
    ])
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      payload: { devices: [{ name: 'Dash node', reason: 'pingFailed' }] },
    })
    emitStateUpdate('dashNode', '21.5')
    expect(service.detectedDevices[0].offline).toBe(true)

    notificationMock.mockClear()
    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(service.detectedDevices).toEqual([])
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: false,
      payload: undefined,
    })
  })

  it('should honor the diagnostic notification toggle for ping failures', async () => {
    pingMock.mockResolvedValue(false)
    const service = new DeviceMonitorService(readMqttLastReport)
    emitStateUpdate(Entities.inputBoolean.system.alertSelfDiagnostic, 'off')
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    await Promise.resolve()
    expect(service.detectedDevices[0].offline).toBe(true)
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offlineSensor', enabled: true }),
    )
    emitStateUpdate(Entities.inputBoolean.system.alertSelfDiagnostic, 'on')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      payload: { devices: [{ name: 'Dash node', reason: 'pingFailed' }] },
    })
  })

  it('should log local probe errors without marking the device offline and retry later', async () => {
    const error = new Error('spawn ping ENOENT')
    pingMock.mockRejectedValueOnce(error).mockResolvedValue(false)
    const service = new DeviceMonitorService(readMqttLastReport)
    await Promise.resolve()
    expect(service.detectedDevices).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      'Device ping failed',
      expect.objectContaining({ ipAddress: '192.168.1.5', error }),
    )

    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(service.detectedDevices[0].offline).toBe(true)

    pingMock.mockRejectedValueOnce(error)
    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(service.detectedDevices[0].offline).toBe(true)
  })

  it('should not start another ping while the previous check is pending', async () => {
    let completePing!: (reachable: boolean) => void
    pingMock.mockReturnValueOnce(
      new Promise((resolve) => {
        completePing = resolve
      }),
    )
    new DeviceMonitorService(readMqttLastReport)
    jest.advanceTimersByTime(twoHours)
    expect(pingMock).toHaveBeenCalledTimes(1)
    completePing(true)
    await Promise.resolve()
    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(pingMock).toHaveBeenCalledTimes(2)
  })
})
