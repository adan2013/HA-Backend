import { notifications, serviceCall } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'
import {
  washingMachinePlugId,
  washingMachineStateId,
} from './washingMachineWatchdog'

describe('washing machine watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEntity(washingMachinePlugId, '0.6')
    mockEntity(washingMachineStateId, 'LOADED')
  })

  it('should reset state of the washing machine', () => {
    const serviceMock = jest.fn()
    serviceCall.on(serviceMock)
    new ReminderService()
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: washingMachineStateId,
      domain: 'input_select',
      service: 'select_option',
      data: {
        option: 'EMPTY',
      },
    })
  })

  it('should set correct washing machine state', () => {
    const serviceMock = jest.fn()
    serviceCall.on(serviceMock)
    new ReminderService()
    emitStateUpdate(washingMachinePlugId, '40')
    jest.advanceTimersByTime(65000)
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: washingMachineStateId,
      domain: 'input_select',
      service: 'select_option',
      data: {
        option: 'WORKING',
      },
    })
    emitStateUpdate(washingMachinePlugId, '1')
    jest.advanceTimersByTime(310000)
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: washingMachineStateId,
      domain: 'input_select',
      service: 'select_option',
      data: {
        option: 'LOADED',
      },
    })
  })

  it('should trigger notification on washing machine state change', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    new ReminderService()
    emitStateUpdate(washingMachineStateId, 'WORKING')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate(washingMachineStateId, 'EMPTY')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate(washingMachineStateId, 'LOADED')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: true,
    })
  })
})
