import { notifications } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'
import { washingMachinePlugPowerId } from './washingMachineWatchdog'

describe('washing machine watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    notifications.resetListeners()
    mockEntity(washingMachinePlugPowerId, '0.6')
  })

  it('should trigger notification on washing machine state change', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate(washingMachinePlugPowerId, '40')
    jest.advanceTimersByTime(310000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate(washingMachinePlugPowerId, '1')
    jest.advanceTimersByTime(310000)
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: true,
    })
  })

  it('should not trigger notification if service is disabled', () => {
    const notificationMock = jest.fn()
    const service = new ReminderService()
    notifications.on(notificationMock)
    service.setServiceEnabled(false)

    emitStateUpdate(washingMachinePlugPowerId, '40')
    jest.advanceTimersByTime(65000)

    emitStateUpdate(washingMachinePlugPowerId, '1')
    jest.advanceTimersByTime(310000)

    expect(notificationMock).not.toHaveBeenCalled()
  })
})
