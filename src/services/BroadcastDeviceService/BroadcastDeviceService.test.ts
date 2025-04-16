import { notifications } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import BroadcastDeviceService from './BroadcastDeviceService'

jest.mock('../../configs/broadcastDevices.config', () => [
  {
    entityId: 'cameraId',
    name: 'Camera sensor',
    type: 'camera',
  },
  {
    entityId: 'microphoneId',
    name: 'Microphone sensor',
    type: 'microphone',
  },
])

const checkServiceStatus = (
  service: BroadcastDeviceService,
  msg: string,
  color: string,
  enabled = true,
) => {
  const status = service.getServiceStatus().status
  expect(status).toEqual({
    enabled,
    message: msg,
    color,
  })
}

describe('BroadcastDeviceService', () => {
  beforeEach(() => {
    mockEntity('cameraId', 'off')
    mockEntity('microphoneId', 'off')
  })

  afterEach(() => {
    notifications.resetListeners()
  })

  it('should init broadcast device service with correct status', () => {
    const service = new BroadcastDeviceService()
    checkServiceStatus(service, 'Camera count: 0; Microphone count: 0', 'green')
  })

  it('should trigger the microphone notification when a microphone is detected', () => {
    const service = new BroadcastDeviceService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('microphoneId', 'on')
    checkServiceStatus(
      service,
      'Camera count: 0; Microphone count: 1',
      'yellow',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceMicrophone',
      enabled: true,
      extraInfo: 'Microphone sensor',
    })

    notificationMock.mockReset()

    emitStateUpdate('microphoneId', 'off')
    checkServiceStatus(service, 'Camera count: 0; Microphone count: 0', 'green')
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceMicrophone',
      enabled: false,
    })
  })

  it('should trigger the camera notification when a camera is detected', () => {
    const service = new BroadcastDeviceService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('cameraId', 'on')
    checkServiceStatus(
      service,
      'Camera count: 1; Microphone count: 0',
      'yellow',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceCamera',
      enabled: true,
      extraInfo: 'Camera sensor',
    })

    notificationMock.mockReset()

    emitStateUpdate('cameraId', 'off')
    checkServiceStatus(service, 'Camera count: 0; Microphone count: 0', 'green')
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceCamera',
      enabled: false,
    })
  })

  it('should trigger only the camera notification when both types are detected', () => {
    const service = new BroadcastDeviceService()
    emitStateUpdate('microphoneId', 'on')

    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('cameraId', 'on')
    checkServiceStatus(
      service,
      'Camera count: 1; Microphone count: 1',
      'yellow',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceCamera',
      enabled: true,
      extraInfo: 'Camera sensor',
    })
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceMicrophone',
      enabled: false,
    })

    notificationMock.mockReset()
    emitStateUpdate('cameraId', 'off')
    checkServiceStatus(
      service,
      'Camera count: 0; Microphone count: 1',
      'yellow',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceMicrophone',
      enabled: true,
      extraInfo: 'Microphone sensor',
    })
    expect(notificationMock).toBeCalledWith({
      id: 'broadcastDeviceCamera',
      enabled: false,
    })
  })

  it('should ignore all the devices when the service is disabled', () => {
    const service = new BroadcastDeviceService()
    service.setServiceEnabled(false)

    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('microphoneId', 'on')
    emitStateUpdate('cameraId', 'on')
    checkServiceStatus(service, 'Service is disabled', 'none', false)
    expect(notificationMock).not.toHaveBeenCalledWith({
      id: 'broadcastDeviceMicrophone',
      enabled: true,
      extraInfo: 'Microphone sensor',
    })
    expect(notificationMock).not.toHaveBeenCalledWith({
      id: 'broadcastDeviceCamera',
      enabled: true,
      extraInfo: 'Camera sensor',
    })
  })
})
