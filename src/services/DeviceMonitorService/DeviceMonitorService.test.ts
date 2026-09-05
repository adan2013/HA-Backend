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

jest.mock('../../configs/deviceMonitor.config', () => [
  { entityId: 'important1', name: 'name1', maxHoursWithoutUpdate: 3 },
  { entityId: 'important2', name: 'name2', maxHoursWithoutUpdate: 3 },
  { entityId: 'important3', name: 'name3' },
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

  afterEach(() => jest.clearAllTimers())

  it('should initialize service with correct status', () => {
    const service = new DeviceMonitorService()
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Offline: 0; No update: 0; On watchlist: 3',
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
      message:
        'Low batteries: 1; Offline: 0; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      extraInfo: 'Living room remote',
    })
  })

  it('should trigger offline notification only for the watchlist', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important3', 'unknown')

    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Offline: 1; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      extraInfo: 'name3',
    })
  })

  it('should detect low batteries and monitored offline devices', () => {
    const service = new DeviceMonitorService()
    emitTestEntityUpdates()

    expect(service.detectedDevices).toEqual([
      {
        entityId: 'sensor.standard3_battery',
        name: 'standard3_name',
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'sensor.standard4_battery',
        name: 'standard4_name',
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'sensor.important1_battery',
        name: 'important1_name',
        lowBattery: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'important2',
        name: 'name2',
        lowBattery: false,
        offline: true,
        noUpdate: false,
        monitored: true,
      },
    ])
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 3; Offline: 1; No update: 0; On watchlist: 3',
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
    expect(notificationMock).not.toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1',
    })
    jest.advanceTimersByTime(60 * 1000)
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1',
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
    expect(notificationMock).not.toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1',
    })
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
    expect(notificationMock).not.toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1',
    })
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Offline: 0; No update: 0; On watchlist: 3',
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
      extraInfo: 'name1, name2',
    })

    emitStateUpdate('important1', '21.6')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name2',
    })
  })
})
