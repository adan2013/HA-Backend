import '../../events/EventEmitterHub'
import NotificationsSerivce from './NotificationsService'
import {
  notifications,
  serviceCall,
  webSocketMessage,
} from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import WS_CMD from '../../connectors/wsCommands'
import Entities from '../../configs/entities.config'

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-05-15T12:00:00Z'))
    mockEntity(Entities.inputBoolean.notifications.tabletLight, 'on')
    mockEntity(Entities.inputBoolean.notifications.soundOn, 'on')
    mockEntity(Entities.inputBoolean.notifications.dndAtNight, 'on')
    mockEntity(Entities.light.dashNodeTabletNotificationLights, 'off')
  })

  afterEach(() => {
    serviceCall.resetListeners()
  })

  it('should turn off tablet light on startup', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const service = new NotificationsSerivce()
    expect(service).toBeDefined()
    expect(service.getServiceStatus()).toEqual({
      helpers: {},
      status: {
        color: 'green',
        message: 'Active notifications: 0, DND mode: OFF',
        enabled: true,
      },
    })
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: Entities.light.dashNodeTabletNotificationLights,
      domain: 'light',
      service: 'turn_off',
    })
  })

  it('should add or remove notification on notification event', () => {
    const service = new NotificationsSerivce()
    expect(service.count).toBe(0)
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    expect(service.count).toBe(1)
    notifications.emit({
      id: 'test2',
      enabled: true,
      extraInfo: 'extra payload',
    })
    expect(service.count).toBe(2)
    expect(service.getNotifications()).toMatchSnapshot()
    notifications.emit({
      id: 'test3',
      enabled: false,
    })
    expect(service.count).toBe(1)
  })

  it('should trigger manually the notification', () => {
    const service = new NotificationsSerivce()
    webSocketMessage(WS_CMD.incoming.TRIGGER_NOTIFICATION).emit({
      sendResponse: jest.fn(),
      message: {
        notificationId: 'test3',
      },
    })
    expect(service.count).toBe(1)
    const firstNotification = service.getNotifications()[0]
    expect(firstNotification.id).toBe('test3')
    expect(firstNotification.extraInfo).toBe('Notification triggered manually')
    expect(firstNotification.canBeDismissed).toBe(true)
    expect(service.getServiceStatus()).toEqual({
      helpers: {},
      status: {
        color: 'green',
        message: 'Active notifications: 1, DND mode: OFF',
        enabled: true,
      },
    })
  })

  it('should dismiss the notification', () => {
    const service = new NotificationsSerivce()
    webSocketMessage(WS_CMD.incoming.TRIGGER_NOTIFICATION).emit({
      sendResponse: jest.fn(),
      message: {
        notificationId: 'test3',
      },
    })
    webSocketMessage(WS_CMD.incoming.DISMISS_NOTIFICATION).emit({
      sendResponse: jest.fn(),
      message: {
        notificationId: 'test1',
      },
    })
    expect(service.count).toBe(1)
    webSocketMessage(WS_CMD.incoming.DISMISS_NOTIFICATION).emit({
      sendResponse: jest.fn(),
      message: {
        notificationId: 'test3',
      },
    })
    expect(service.count).toBe(0)
  })

  it('should add or remove notification only if service is enabled', () => {
    const service = new NotificationsSerivce()
    service.setServiceEnabled(false)
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    expect(service.count).toBe(0)
    service.setServiceEnabled(true)
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    expect(service.count).toBe(1)
    service.setServiceEnabled(false)
    notifications.emit({
      id: 'test3',
      enabled: false,
    })
    expect(service.count).toBe(1)
  })

  it('should not create any duplicated notification type', () => {
    const service = new NotificationsSerivce()
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    expect(service.count).toBe(1)
    notifications.emit({
      id: 'test3',
      enabled: true,
      extraInfo: 'extra payload',
    })
    expect(service.count).toBe(1)
    expect(service.getNotifications()[0].extraInfo).toBe('extra payload')
    notifications.emit({
      id: 'test3',
      enabled: true,
      extraInfo: 'another extra payload',
    })
    expect(service.count).toBe(1)
    expect(service.getNotifications()[0].extraInfo).toBe(
      'another extra payload',
    )
  })

  it('should play alert sound only if DND is not active or notification can ignore DND', () => {
    const test1Sound = 'scale_up:d=32,o=5,b=100:c,c#,d#,e,f#,g#,a#,b'
    const test2Sound = 'two_short:d=4,o=5,b=100:16e6,16e6'
    const soundPayload = (data: string) => ({
      domain: 'esphome',
      service: 'dash_node_play_rtttl',
      data: {
        song_str: data,
      },
    })
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    jest.setSystemTime(new Date('2023-05-15T23:59:00Z'))
    const service = new NotificationsSerivce()
    service.updateDndMode()
    expect(service.dndIsActive).toBe(true)
    notifications.emit({
      id: 'test1',
      enabled: true,
    })
    expect(serviceCallMock).not.toHaveBeenCalledWith(soundPayload(test1Sound))
    notifications.emit({
      id: 'test2',
      enabled: true,
    })
    expect(serviceCallMock).toHaveBeenCalledWith(soundPayload(test2Sound))
    jest.setSystemTime(new Date('2023-05-15T12:00:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(false)
    notifications.emit({
      id: 'test1',
      enabled: true,
      extraInfo: 'second call',
    })
    expect(serviceCallMock).toHaveBeenCalledWith(soundPayload(test1Sound))
  })

  it('should play alert sound only if sound toggle is on', () => {
    const servicePayload = {
      domain: 'esphome',
      service: 'dash_node_play_rtttl',
      data: {
        song_str: 'scale_up:d=32,o=5,b=100:c,c#,d#,e,f#,g#,a#,b',
      },
    }
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    new NotificationsSerivce()
    emitStateUpdate(Entities.inputBoolean.notifications.soundOn, 'off')
    notifications.emit({
      id: 'test1',
      enabled: true,
    })
    expect(serviceCallMock).not.toBeCalledWith(servicePayload)
    emitStateUpdate(Entities.inputBoolean.notifications.soundOn, 'on')
    notifications.emit({
      id: 'test1',
      enabled: true,
      extraInfo: 'second call',
    })
    expect(serviceCallMock).toBeCalledWith(servicePayload)
  })

  it('should turn on notification light only if light toggle is on', () => {
    const servicePayload = {
      entityId: Entities.light.dashNodeTabletNotificationLights,
      domain: 'light',
      service: 'turn_on',
      data: {
        rgb_color: [255, 5, 25],
      },
    }
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    new NotificationsSerivce()
    emitStateUpdate(Entities.inputBoolean.notifications.tabletLight, 'off')
    notifications.emit({
      id: 'test1',
      enabled: true,
    })
    expect(serviceCallMock).not.toBeCalledWith(servicePayload)
    emitStateUpdate(Entities.inputBoolean.notifications.tabletLight, 'on')
    notifications.emit({
      id: 'test1',
      enabled: true,
      extraInfo: 'second call',
    })
    expect(serviceCallMock).toBeCalledWith(servicePayload)
  })

  it('should turn on and off DND mode if toggle is on', () => {
    const service = new NotificationsSerivce()
    jest.setSystemTime(new Date('2023-05-15T23:59:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(true)
    expect(service.getServiceStatus()).toEqual({
      helpers: {},
      status: {
        color: 'green',
        message: 'Active notifications: 0, DND mode: ON',
        enabled: true,
      },
    })
    jest.setSystemTime(new Date('2023-05-15T07:34:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(false)
    emitStateUpdate(Entities.inputBoolean.notifications.dndAtNight, 'off')
    jest.setSystemTime(new Date('2023-05-15T23:59:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(false)
  })

  it('should turn on the correct notification light depends on the priority, DND mode and ignoreDND flag', () => {
    const service = new NotificationsSerivce()
    expect(service.lastActiveLight).toBe(null)
    notifications.emit({
      id: 'test2',
      enabled: true,
    })
    expect(service.lastActiveLight).toBe('yellow')
    notifications.emit({
      id: 'test1',
      enabled: true,
    })
    expect(service.lastActiveLight).toBe('red')
    jest.setSystemTime(new Date('2023-05-15T23:59:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(true)
    expect(service.lastActiveLight).toBe('yellow')
    notifications.emit({
      id: 'test2',
      enabled: false,
    })
    expect(service.lastActiveLight).toBe(null)
    jest.setSystemTime(new Date('2023-05-15T12:00:00Z'))
    service.updateDndMode()
    expect(service.dndIsActive).toBe(false)
    expect(service.lastActiveLight).toBe('red')
  })

  it('should sort active notifications by the priority', () => {
    const service = new NotificationsSerivce()
    notifications.emit({
      id: 'test3',
      enabled: true,
    })
    notifications.emit({
      id: 'test2',
      enabled: true,
    })
    notifications.emit({
      id: 'test1',
      enabled: true,
    })
    const IDs = service.getNotifications().map((n) => n.id)
    expect(IDs).toEqual(['test1', 'test2', 'test3'])
  })
})
