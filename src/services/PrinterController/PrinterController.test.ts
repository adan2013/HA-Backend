import { notifications, serviceCall } from '../../events/events'
import { mockEntity, emitStateUpdate } from '../../utils/testUtils'
import PrinterController, {
  autoOffToggleId,
  printerCurrentLayerId,
  printerNozzleTempId,
  printerPlugId,
  printerProgressPercentageId,
  printerRemainingTimeId,
  PrinterStatus,
  printerStatusId,
  printerTotalLayerCountId,
} from './PrinterController'
import { ServiceCallPayload } from '../../events/eventPayloads'

type TestConfig = {
  serviceEnabled?: boolean
  automationToggle?: boolean
  printerPlugIsOn: boolean
  printerStatus: PrinterStatus
  progressPercentage?: number
  currentLayer?: number
  totalLayerCount?: number
  remainingTime?: number
  nozzleTemp: string
}

const initService = ({
  serviceEnabled = true,
  automationToggle = true,
  printerPlugIsOn,
  printerStatus,
  progressPercentage = 0,
  currentLayer = 1,
  totalLayerCount = 300,
  remainingTime = 64,
  nozzleTemp,
}: TestConfig): {
  serviceCall: jest.Mock
  notification: jest.Mock
} => {
  serviceCall.resetListeners()
  mockEntity(autoOffToggleId, automationToggle ? 'on' : 'off')
  mockEntity(printerPlugId, printerPlugIsOn ? 'on' : 'off')
  mockEntity(printerStatusId, printerStatus)
  mockEntity(printerNozzleTempId, nozzleTemp)
  mockEntity(printerProgressPercentageId, progressPercentage.toString())
  mockEntity(printerCurrentLayerId, currentLayer.toString())
  mockEntity(printerTotalLayerCountId, totalLayerCount.toString())
  mockEntity(printerRemainingTimeId, remainingTime.toString())
  const printerController = new PrinterController()
  printerController.setServiceEnabled(serviceEnabled)
  const serviceCallMock = jest.fn()
  const notificationMock = jest.fn()
  serviceCall.on(serviceCallMock)
  notifications.on(notificationMock)
  emitStateUpdate(printerNozzleTempId, nozzleTemp)
  emitStateUpdate(printerStatusId, printerStatus)
  return { serviceCall: serviceCallMock, notification: notificationMock }
}

const turnOffPrinterServiceCall: ServiceCallPayload = {
  domain: 'switch',
  service: 'turn_off',
  entityId: printerPlugId,
}

const turnOffAutomationServiceCall: ServiceCallPayload = {
  domain: 'input_boolean',
  service: 'turn_off',
  entityId: autoOffToggleId,
}

describe('PrinterController', () => {
  describe('auto off feature', () => {
    it('should turn off printer and automation when nozzle is cold, print is finished and printer is on', () => {
      const { serviceCall } = initService({
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(serviceCall).toHaveBeenCalledTimes(2)
      expect(serviceCall).toHaveBeenCalledWith(turnOffPrinterServiceCall)
      expect(serviceCall).toHaveBeenCalledWith(turnOffAutomationServiceCall)
    })

    it('should not turn off printer when nozzle is still hot', () => {
      const { serviceCall } = initService({
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '51',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })

    it('should not turn off printer when print is not finished', () => {
      const { serviceCall } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        nozzleTemp: '41',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })

    it('should not turn off printer when printer is already off', () => {
      const { serviceCall } = initService({
        printerPlugIsOn: false,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })

    it('should not turn off printer when automation is off', () => {
      const { serviceCall } = initService({
        automationToggle: false,
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })

    it('should not turn off printer when service is disabled', () => {
      const { serviceCall } = initService({
        serviceEnabled: false,
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })

    it('should not turn off printer when nozzle temp is not a number', () => {
      const { serviceCall } = initService({
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: 'strange value',
      })
      expect(serviceCall).not.toHaveBeenCalled()
    })
  })

  describe('printer status notification', () => {
    it('should enable status notification when printer is printing', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        progressPercentage: 10,
        currentLayer: 14,
        totalLayerCount: 200,
        remainingTime: 64,
        nozzleTemp: '230',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintStatus',
        enabled: true,
        extraInfo: '[10%] 14 / 200, 1h 4m remaining',
      })
    })

    it('should hide remaining time when it is 0', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        remainingTime: 0,
        nozzleTemp: '230',
        progressPercentage: 10,
        currentLayer: 14,
        totalLayerCount: 200,
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintStatus',
        enabled: true,
        extraInfo: '[10%] 14 / 200',
      })
    })

    it('should disable status notification when printer is not printing', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintStatus',
        enabled: false,
      })
    })
  })

  describe('other notifications', () => {
    it('should enable paused notification when printer is paused', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'pause',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintPaused',
        enabled: true,
      })
    })

    it('should disable paused notification when printer is not paused', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintPaused',
        enabled: false,
      })
    })

    it('should enable failed notification when printer is failed', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'failed',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintFailed',
        enabled: true,
      })
    })

    it('should disable failed notification when printer is not failed', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintFailed',
        enabled: false,
      })
    })

    it('should enable finished notification when printer is finished', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'finish',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintFinished',
        enabled: true,
      })
    })

    it('should disable finished notification when printer is not finished', () => {
      const { notification } = initService({
        printerPlugIsOn: true,
        printerStatus: 'running',
        nozzleTemp: '41',
      })
      expect(notification).toHaveBeenCalledWith({
        id: '3dPrintFinished',
        enabled: false,
      })
    })
  })
})
