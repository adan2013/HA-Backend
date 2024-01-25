import { notifications } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'
import { alertToggleId, deadboltSensorId } from './mainDoorDeadboltWatchdog'

describe('main door deadbolt watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEntity(alertToggleId, 'on')
    mockEntity(deadboltSensorId, 'off')
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
    new ReminderService()
    checkNotificationState(notificationMock, false, false)
    notificationMock.mockReset()
    emitStateUpdate(deadboltSensorId, 'on')
    checkNotificationState(notificationMock, true, false)
    notificationMock.mockReset()
    jest.advanceTimersByTime(61000)
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
    new ReminderService()
    emitStateUpdate(deadboltSensorId, 'on')
    checkNotificationState(notificationMock, true, false)
    emitStateUpdate(alertToggleId, 'off')
    checkNotificationState(notificationMock, false, false)
    emitStateUpdate(alertToggleId, 'on')
    checkNotificationState(notificationMock, true, false)
  })
})
