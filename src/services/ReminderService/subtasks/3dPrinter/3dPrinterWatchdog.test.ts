import { notifications } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'
import { printerPowerId } from './3dPrinterWatchdog'

describe('3D printer watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    notifications.resetListeners()
    mockEntity(printerPowerId, '2.4')
  })

  it('should trigger notification on printer state change', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: '3dPrintFinished',
      enabled: false,
    })
    emitStateUpdate(printerPowerId, '95')
    jest.advanceTimersByTime(130000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: '3dPrintFinished',
      enabled: false,
    })
    emitStateUpdate(printerPowerId, '16')
    jest.advanceTimersByTime(130000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: '3dPrintFinished',
      enabled: true,
    })
  })

  it('should not trigger notification if service is disabled', () => {
    const notificationMock = jest.fn()
    const service = new ReminderService()
    notifications.on(notificationMock)
    service.setServiceEnabled(false)

    emitStateUpdate(printerPowerId, '95')
    jest.advanceTimersByTime(130000)

    emitStateUpdate(printerPowerId, '16')
    jest.advanceTimersByTime(130000)

    expect(notificationMock).not.toHaveBeenCalled()
  })
})
