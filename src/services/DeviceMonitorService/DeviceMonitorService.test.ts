import DeviceMonitorService from './DeviceMonitorService'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import {
  anyEntityUpdate,
  entityStateRequest,
  entityUpdate,
  notifications,
} from '../../events/events'
import Entities from '../../configs/entities.config'

jest.mock('../../configs/deviceMonitor.config', () => [
  {
    entityId: 'important1',
    name: 'name1',
    maxHoursWithoutUpdate: 3,
  },
  {
    entityId: 'important2',
    name: 'name2',
    maxHoursWithoutUpdate: 3,
  },
  {
    entityId: 'important3',
    name: 'name3',
  },
])

const emitTestEntityUpdates = () => {
  const emit = (id: string, bat: number, sig: number, state = 'on') => {
    emitStateUpdate(id, state, {
      battery: bat,
      linkquality: sig,
    })
  }
  emit('standard1', 100, 255)
  emit('standard2', 40, 78)
  emit('standard3', 30, 30)
  emit('standard4', 15, 100)
  emit('standard5', 50, 14)
  emit('standard6', 5, 5)
  emit('standard6', 100, 5)
  emit('standard7', 100, 5, 'unavailable')
  emit('standard7', 5, 50, 'unavailable')
  emit('important1', 10, 5)
  emit('important2', 60, 200)
  emit('important2', 15, 50, 'unknown')
  emit('important3', 60, 150)
}

describe('Device monitor service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-05T12:00:00Z'))
    anyEntityUpdate.resetListeners()
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
  })

  it('should initialize service with correct status', () => {
    const service = new DeviceMonitorService()
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Low signal: 0; Offline: 0; No update: 0; On watchlist: 3',
      color: 'green',
    })
  })

  it('should trigger low battery notification', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('sensor', 'off', {
      battery: 12,
      linkquality: 200,
    })
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 1; Low signal: 0; Offline: 0; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      extraInfo: 'sensor',
    })
  })

  it('should trigger offline sensor notification', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('important3', 'unknown', {
      battery: 50,
      linkquality: 100,
    })
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Low signal: 0; Offline: 1; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'offlineSensor',
      enabled: true,
      extraInfo: 'name3',
    })
  })

  it('should trigger weak signal sensor notification', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important3', 'off', {
      battery: 50,
      linkquality: 10,
    })
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Low signal: 1; Offline: 0; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'weakSignal',
      enabled: true,
      extraInfo: 'name3',
    })
  })

  it('should detect all devices with low battery level and signal quality', () => {
    const service = new DeviceMonitorService()
    emitTestEntityUpdates()
    expect(service.detectedDevices).toEqual([
      {
        entityId: 'standard3',
        name: 'standard3',
        lowBattery: true,
        lowSignal: true,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'standard4',
        name: 'standard4',
        lowBattery: true,
        lowSignal: false,
        offline: false,
        noUpdate: false,
        monitored: false,
      },
      {
        entityId: 'important1',
        name: 'name1',
        lowBattery: true,
        lowSignal: true,
        offline: false,
        noUpdate: false,
        monitored: true,
      },
      {
        entityId: 'important2',
        name: 'name2',
        lowBattery: false,
        lowSignal: false,
        offline: true,
        noUpdate: false,
        monitored: true,
      },
    ])
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 3; Low signal: 2; Offline: 1; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
  })

  it('should not trigger any notification if the alerts are disabled', () => {
    const service = new DeviceMonitorService()
    emitStateUpdate(Entities.inputBoolean.system.alertBatteryLevel, 'off')
    emitStateUpdate(Entities.inputBoolean.system.alertSelfDiagnostic, 'off')
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitTestEntityUpdates()
    expect(service.detectedDevices).toHaveLength(4)
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 3; Low signal: 2; Offline: 1; No update: 0; On watchlist: 3',
      color: 'yellow',
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: false,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'weakSignal',
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

  it('should notify when a configured sensor has not updated for three hours', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5', {
      battery: 50,
      linkquality: 100,
    })
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
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Low signal: 0; Offline: 0; No update: 1; On watchlist: 3',
      color: 'yellow',
    })

    emitStateUpdate('important1', '21.6', {
      battery: 50,
      linkquality: 100,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: false,
    })
  })

  it('should detect a missing update from the initial Home Assistant state', () => {
    entityStateRequest.on(({ entityId, callback }) => {
      if (entityId === 'important1') {
        callback({
          id: entityId,
          state: '21.5',
          lastChanged: '2026-09-05T08:59:00Z',
          lastUpdated: '2026-09-05T08:59:00Z',
          attributes: {
            friendly_name: 'Important sensor',
            battery: 50,
            linkquality: 100,
          },
        })
      }
    })
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    const service = new DeviceMonitorService()

    expect(notificationMock).toHaveBeenCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1',
    })
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Low batteries: 0; Low signal: 0; Offline: 0; No update: 1; On watchlist: 3',
      color: 'yellow',
    })
  })

  it('should update notification extra info when the stale sensor list changes', () => {
    new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important1', '21.5', {
      battery: 50,
      linkquality: 100,
    })
    emitStateUpdate('important2', '22.5', {
      battery: 50,
      linkquality: 100,
    })
    notificationMock.mockClear()

    jest.advanceTimersByTime(3 * 60 * 60 * 1000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name1, name2',
    })

    emitStateUpdate('important1', '21.6', {
      battery: 50,
      linkquality: 100,
    })
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'noSensorUpdate',
      enabled: true,
      extraInfo: 'name2',
    })
  })
})
