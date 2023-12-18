import ReminderService from './ReminderService'
import { notifications, serviceCall } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'

jest.useFakeTimers()
mockEntity('sensor.washingmachineplug_power', '0.6')
mockEntity('input_select.washingmachinestate', 'LOADED')

describe('ReminderService', () => {
  it('should reset state of the washing machine', () => {
    const serviceMock = jest.fn()
    serviceCall.on(serviceMock)
    new ReminderService()
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: 'input_select.washingmachinestate',
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
    emitStateUpdate('sensor.washingmachineplug_power', '40')
    jest.advanceTimersByTime(65000)
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: 'input_select.washingmachinestate',
      domain: 'input_select',
      service: 'select_option',
      data: {
        option: 'WORKING',
      },
    })
    emitStateUpdate('sensor.washingmachineplug_power', '1')
    jest.advanceTimersByTime(310000)
    expect(serviceMock).toHaveBeenCalledWith({
      entityId: 'input_select.washingmachinestate',
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
    emitStateUpdate('input_select.washingmachinestate', 'WORKING')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate('input_select.washingmachinestate', 'EMPTY')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: false,
    })
    emitStateUpdate('input_select.washingmachinestate', 'LOADED')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'loadedWashingMachine',
      enabled: true,
    })
  })
})
