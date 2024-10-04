import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'
import {
  automationToggleId,
  nozzleTempId,
  printerPlugId,
  printerStatusId,
} from './3dPrinterAutoOffSwitch'
import { serviceCall } from '../../../../events/events'
import { ServiceCallPayload } from '../../../../events/eventPayloads'

type TestConfig = {
  serviceEnabled?: boolean
  automationToggle?: boolean
  printerPlugIsOn: boolean
  printerStatus: string
  nozzleTemp: string
}

const initService = ({
  serviceEnabled = true,
  automationToggle = true,
  printerPlugIsOn,
  printerStatus,
  nozzleTemp,
}: TestConfig): jest.Mock => {
  serviceCall.resetListeners()
  mockEntity(automationToggleId, automationToggle ? 'on' : 'off')
  mockEntity(printerPlugId, printerPlugIsOn ? 'on' : 'off')
  mockEntity(printerStatusId, printerStatus)
  mockEntity(nozzleTempId, nozzleTemp)
  const reminderService = new ReminderService()
  reminderService.setServiceEnabled(serviceEnabled)
  const serviceCallMock = jest.fn()
  serviceCall.on(serviceCallMock)
  emitStateUpdate(nozzleTempId, nozzleTemp)
  return serviceCallMock
}

const turnOffPrinterServiceCall: ServiceCallPayload = {
  domain: 'switch',
  service: 'turn_off',
  entityId: printerPlugId,
}

const turnOffAutomationServiceCall: ServiceCallPayload = {
  domain: 'input_boolean',
  service: 'turn_off',
  entityId: automationToggleId,
}

describe('3D printer auto off switch', () => {
  it('should turn off printer and automation when nozzle is cold, print is finished and printer is on', () => {
    const serviceCall = initService({
      printerPlugIsOn: true,
      printerStatus: 'finish',
      nozzleTemp: '41',
    })
    expect(serviceCall).toHaveBeenCalledTimes(2)
    expect(serviceCall).toHaveBeenCalledWith(turnOffPrinterServiceCall)
    expect(serviceCall).toHaveBeenCalledWith(turnOffAutomationServiceCall)
  })

  it('should not turn off printer when nozzle is still hot', () => {
    const serviceCall = initService({
      printerPlugIsOn: true,
      printerStatus: 'finish',
      nozzleTemp: '51',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })

  it('should not turn off printer when print is not finished', () => {
    const serviceCall = initService({
      printerPlugIsOn: true,
      printerStatus: 'printing',
      nozzleTemp: '41',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })

  it('should not turn off printer when printer is already off', () => {
    const serviceCall = initService({
      printerPlugIsOn: false,
      printerStatus: 'finish',
      nozzleTemp: '41',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })

  it('should not turn off printer when automation is off', () => {
    const serviceCall = initService({
      automationToggle: false,
      printerPlugIsOn: true,
      printerStatus: 'finish',
      nozzleTemp: '41',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })

  it('should not turn off printer when service is disabled', () => {
    const serviceCall = initService({
      serviceEnabled: false,
      printerPlugIsOn: true,
      printerStatus: 'finish',
      nozzleTemp: '41',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })

  it('should not turn off printer when nozzle temp is not a number', () => {
    const serviceCall = initService({
      printerPlugIsOn: true,
      printerStatus: 'finish',
      nozzleTemp: 'strange value',
    })
    expect(serviceCall).not.toHaveBeenCalled()
  })
})
