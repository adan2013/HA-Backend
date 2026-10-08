import { notifications, smsGateway } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import MainDoorService, {
  alertToggleId,
  deadboltSensorId,
} from './MainDoorService'

describe('MainDoorService', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    smsGateway.resetListeners()
    mockEntity(alertToggleId, 'on')
    mockEntity(deadboltSensorId, 'off')
  })

  it('requests one SMS after 30 seconds of red alert without resetting on repeated sensor reports', () => {
    const smsMock = jest.fn()
    smsGateway.on(smsMock)
    new MainDoorService()
    emitStateUpdate(deadboltSensorId, 'on')
    jest.advanceTimersByTime(60000)
    emitStateUpdate(deadboltSensorId, 'on')
    jest.advanceTimersByTime(30000)
    expect(smsMock).not.toHaveBeenCalled()
    emitStateUpdate(deadboltSensorId, 'on')
    jest.advanceTimersByTime(29999)
    expect(smsMock).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(smsMock).toHaveBeenCalledTimes(1)
    expect(smsMock).toHaveBeenCalledWith({
      source: 'mainDoorOpen',
      text: 'The main door is open.',
    })
    jest.advanceTimersByTime(120000)
    expect(smsMock).toHaveBeenCalledTimes(1)
    emitStateUpdate(deadboltSensorId, 'off')
    emitStateUpdate(deadboltSensorId, 'on')
    jest.advanceTimersByTime(120000)
    expect(smsMock).toHaveBeenCalledTimes(2)
  })

  it('cancels the SMS countdown when the door closes during the red alert', () => {
    const smsMock = jest.fn()
    smsGateway.on(smsMock)
    new MainDoorService()
    emitStateUpdate(deadboltSensorId, 'on')
    jest.advanceTimersByTime(110000)
    emitStateUpdate(deadboltSensorId, 'off')
    jest.advanceTimersByTime(30000)
    expect(smsMock).not.toHaveBeenCalled()
  })

  const checkNotificationState = (
    notificationMock: jest.Mock,
    open = false,
    alert = false,
  ) => {
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'mainDoorOpen',
      enabled: open,
    })
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'mainDoorOpenAlert',
      enabled: alert,
    })
  }

  it('should show and hide the notification about the open main doors', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new MainDoorService()
    checkNotificationState(notificationMock, false, false)
    notificationMock.mockReset()
    emitStateUpdate(deadboltSensorId, 'on')
    checkNotificationState(notificationMock, true, false)
    notificationMock.mockReset()
    jest.advanceTimersByTime(91000)
    checkNotificationState(notificationMock, false, true)
    notificationMock.mockReset()
    emitStateUpdate(deadboltSensorId, 'unknown')
    checkNotificationState(notificationMock, false, false)
    notificationMock.mockReset()
    emitStateUpdate(deadboltSensorId, 'off')
    checkNotificationState(notificationMock, false, false)
  })

  it('should disable the main door notification if the toggle is off', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new MainDoorService()
    emitStateUpdate(deadboltSensorId, 'on')
    checkNotificationState(notificationMock, true, false)
    emitStateUpdate(alertToggleId, 'off')
    checkNotificationState(notificationMock, false, false)
    emitStateUpdate(alertToggleId, 'on')
    checkNotificationState(notificationMock, true, false)
  })
})
