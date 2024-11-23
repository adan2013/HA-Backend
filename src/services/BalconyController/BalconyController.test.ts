import '../../events/EventEmitterHub'
import BalconyController from './BalconyController'
import { serviceCall } from '../../events/events'
import { mockEntity } from '../../utils/testUtils'
import Entities from '../../configs/entities.config'

jest.useFakeTimers().setSystemTime(new Date('2023-05-15T12:00:00Z'))
mockEntity(Entities.inputBoolean.automations.balconyCircuitAutoSwitch, 'on')
mockEntity(Entities.switch.circuit.balcony, 'off')

describe('BalconyController', () => {
  it('should switch on and off the balcony plug', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const balconyController = new BalconyController()
    balconyController.switchBalconyLight(true)
    expect(serviceCallMock).toBeCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith({
      domain: 'switch',
      service: 'turn_on',
      entityId: Entities.switch.circuit.balcony,
    })
    balconyController.switchBalconyLight(false)
    expect(serviceCallMock).toBeCalledTimes(2)
    expect(serviceCallMock).toBeCalledWith({
      domain: 'switch',
      service: 'turn_off',
      entityId: Entities.switch.circuit.balcony,
    })
  })

  it('should not switch the balcony plug if service is disabled', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const balconyController = new BalconyController()
    balconyController.setServiceEnabled(false)
    balconyController.switchBalconyLight(true)
    expect(serviceCallMock).not.toBeCalled()
  })

  it('should not switch the balcony plug if auto switch toggle is off', () => {
    mockEntity(
      Entities.inputBoolean.automations.balconyCircuitAutoSwitch,
      'off',
    )
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const balconyController = new BalconyController()
    balconyController.switchBalconyLight(true)
    expect(serviceCallMock).not.toBeCalled()
  })
})
