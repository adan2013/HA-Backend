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

jest.mock('../../utils/pingHost')
jest.mock('../../logging/logger', () => ({
  createLogger: jest.fn(() => ({ error: jest.fn() })),
}))

const pingMock = jest.mocked(pingHost)
const loggerCall = jest
  .mocked(createLogger)
  .mock.calls.findIndex(([scope]) => scope === 'DeviceMonitorService')
const logger = jest.mocked(createLogger).mock.results[loggerCall].value
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
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('should initialize service with correct status', () => {
    const service = new DeviceMonitorService()
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Offline: 0; No update: 0; On watchlist: 4',
      color: 'green',
    })
  })

  it('should trigger low battery notification', () => {
    const service = new DeviceMonitorService()
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
    new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    const updateBattery = (value: string) =>
      emitStateUpdate('sensor.remote_battery', value, {
        friendly_name: 'Remote Battery',
      })
    updateBattery('12')
    updateBattery('0')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      payload: { devices: [{ name: 'Remote', batteryPercentage: 0 }] },
    })
    notificationMock.mockClear()
    updateBattery('40')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: false,
      payload: undefined,
    })
  })

  it.each(['-1', '101', 'unknown', 'unavailable', '', 'NaN'])(
    'does not report an invalid battery percentage: %s',
    (value) => {
      new DeviceMonitorService()
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      emitStateUpdate('sensor.remote_battery', value)
      expect(notificationMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lowBattery', enabled: true }),
      )
    },
  )

  it('distinguishes unavailable and unknown entity states', () => {
    new DeviceMonitorService()
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
    const service = new DeviceMonitorService()
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
    const service = new DeviceMonitorService()
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
    new DeviceMonitorService()
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
    new DeviceMonitorService()
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
    new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5')
    jest.advanceTimersByTime(3 * 60 * 60 * 1000)
    notificationMock.mockClear()
    jest.advanceTimersByTime(60 * 60 * 1000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      payload: { devices: [{ name: 'name1', hoursSinceLastReport: 4 }] },
    })
  })

  it('should treat an unchanged state report as device activity', () => {
    new DeviceMonitorService()
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
      expect.objectContaining({ id: 'noSensorUpdate', enabled: true }),
    )
  })

  it('should not initialize update monitoring from cached entity states', () => {
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

    const service = new DeviceMonitorService()

    jest.advanceTimersByTime(4 * 60 * 60 * 1000)

    expect(cachedStateRequest).not.toHaveBeenCalled()
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'noSensorUpdate', enabled: true }),
    )
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Offline: 0; No update: 0; On watchlist: 4',
      color: 'green',
    })
  })

  it('should update notification details as stale sensors recover', () => {
    new DeviceMonitorService()
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
    new DeviceMonitorService()
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
    const service = new DeviceMonitorService()
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

    expect(service.detectedDevices).toEqual([])
    expect(notificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    )
  })

  it('should report a failed ping and recover only after a successful ping', async () => {
    pingMock.mockResolvedValueOnce(false)
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    const service = new DeviceMonitorService()
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
    const service = new DeviceMonitorService()
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
    const service = new DeviceMonitorService()
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
    new DeviceMonitorService()
    jest.advanceTimersByTime(twoHours)
    expect(pingMock).toHaveBeenCalledTimes(1)
    completePing(true)
    await Promise.resolve()
    jest.advanceTimersByTime(twoHours)
    await Promise.resolve()
    expect(pingMock).toHaveBeenCalledTimes(2)
  })
})
