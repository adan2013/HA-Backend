import DeviceMonitorService from './DeviceMonitorService'
import { emitStateUpdate } from '../../utils/testUtils'
import { notifications } from '../../events/events'

jest.mock('../../configs/deviceMonitor.config', () => [
  {
    entityId: 'important1',
    name: 'name1',
  },
  {
    entityId: 'important2',
    name: 'name2',
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
  emit('standard4', 20, 100)
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
  it('should initialize service with correct status', () => {
    const service = new DeviceMonitorService()
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Low signal: 0; Offline: 0; On watchlist: 3',
      color: 'green',
      enabled: true,
    })
  })

  it('should trigger low battery notification', () => {
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('sensor', 'off', {
      battery: 18,
      linkquality: 200,
    })
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 1; Low signal: 0; Offline: 0; On watchlist: 3',
      color: 'yellow',
      enabled: true,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'lowBattery',
      enabled: true,
      extraInfo: 'sensor',
    })
  })

  it('should trigger offline sensor notification', () => {
    const lowSignalStatus = {
      message: 'Low batteries: 0; Low signal: 1; Offline: 0; On watchlist: 3',
      color: 'yellow',
      enabled: true,
    }
    const offlineStatus = {
      message: 'Low batteries: 0; Low signal: 0; Offline: 1; On watchlist: 3',
      color: 'yellow',
      enabled: true,
    }
    const expectedNotificationPayload = {
      id: 'offlineSensor',
      enabled: true,
      extraInfo: 'name3',
    }
    const service = new DeviceMonitorService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate('important3', 'off', {
      battery: 50,
      linkquality: 10,
    })
    expect(service.getServiceStatus().status).toEqual(lowSignalStatus)
    expect(notificationMock).toHaveBeenCalledWith(expectedNotificationPayload)
    emitStateUpdate('important3', 'unknown', {
      battery: 50,
      linkquality: 100,
    })
    expect(service.getServiceStatus().status).toEqual(offlineStatus)
    expect(notificationMock).toHaveBeenCalledWith(expectedNotificationPayload)
  })

  it('should not detect anything if the service is disabled', () => {
    const service = new DeviceMonitorService()
    service.setServiceEnabled(false)
    emitTestEntityUpdates()
    expect(service.detectedDevices).toHaveLength(0)
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 0; Low signal: 0; Offline: 0; On watchlist: 3',
      color: 'green',
      enabled: false,
    })
  })

  it('should detect all devices with low battery level and signal quality', () => {
    const service = new DeviceMonitorService()
    emitTestEntityUpdates()
    expect(service.detectedDevices).toEqual([
      {
        entityId: 'standard4',
        name: 'standard4',
        lowBattery: true,
        lowSignal: false,
        offline: false,
        monitored: false,
      },
      {
        entityId: 'important1',
        name: 'name1',
        lowBattery: true,
        lowSignal: true,
        offline: false,
        monitored: true,
      },
      {
        entityId: 'important2',
        name: 'name2',
        lowBattery: false,
        lowSignal: false,
        offline: true,
        monitored: true,
      },
    ])
    expect(service.getServiceStatus().status).toEqual({
      message: 'Low batteries: 2; Low signal: 1; Offline: 1; On watchlist: 3',
      color: 'yellow',
      enabled: true,
    })
  })
})
