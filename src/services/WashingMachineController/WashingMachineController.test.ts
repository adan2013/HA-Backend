import { notifications } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import WashingMachineController, {
  washingMachinePlugPowerId,
} from './WashingMachineController'

describe('WashingMachineController', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    notifications.resetListeners()
    mockEntity(washingMachinePlugPowerId, '0.6')
  })

  it('should trigger notification on washing machine state change', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new WashingMachineController()
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
})
