import WaterLeakService from './WaterLeakService'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { notifications, smsGateway } from '../../events/events'
import Entities from '../../configs/entities.config'

jest.mock('../../configs/waterLeak.config', () => [
  {
    entityId: 'sensor1',
    name: 'S1',
  },
  {
    entityId: 'sensor2',
    name: 'S2',
  },
])

const checkServiceStatus = (
  service: WaterLeakService,
  msg: string,
  color: string,
) => {
  const status = service.getServiceStatus().status
  expect(status).toEqual({
    message: msg,
    color,
  })
}

describe('WaterLeakService', () => {
  beforeEach(() => {
    smsGateway.resetListeners()
    mockEntity(Entities.inputBoolean.security.waterLeakMonitoring, 'on')
    mockEntity('sensor1', 'off')
    mockEntity('sensor2', 'off')
  })

  it('requests one SMS per alarm episode', () => {
    const smsMock = jest.fn()
    smsGateway.on(smsMock)
    new WaterLeakService()
    emitStateUpdate('sensor1', 'on')
    emitStateUpdate('sensor2', 'on')
    emitStateUpdate('sensor1', 'off')
    expect(smsMock).toHaveBeenCalledTimes(1)
    expect(smsMock).toHaveBeenCalledWith({
      source: 'waterLeak',
      text: 'Water leak detected: S1.',
    })

    emitStateUpdate(Entities.inputBoolean.security.waterLeakMonitoring, 'off')
    emitStateUpdate(Entities.inputBoolean.security.waterLeakMonitoring, 'on')
    expect(smsMock).toHaveBeenCalledTimes(2)
  })

  it('requests an SMS when a sensor is already leaking at startup', () => {
    mockEntity('sensor1', 'on')
    const smsMock = jest.fn()
    smsGateway.on(smsMock)
    new WaterLeakService()
    expect(smsMock).toHaveBeenCalledWith({
      source: 'waterLeak',
      text: 'Water leak detected: S1.',
    })
  })

  it('should init water leak service with correct status', () => {
    const service = new WaterLeakService()
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: false; Alarm: false',
      'green',
    )
  })

  it('should trigger the alarm when a water leak is detected', () => {
    const service = new WaterLeakService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)

    emitStateUpdate('sensor2', 'on')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: true; Alarm: true',
      'red',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'waterLeak',
      enabled: true,
      extraInfo: 'S2',
    })

    notificationMock.mockReset()

    emitStateUpdate('sensor2', 'off')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: false; Alarm: true',
      'red',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'waterLeak',
      enabled: true,
      extraInfo: 'S2',
    })
  })

  it('should reset the alarm and hide the notification', () => {
    const service = new WaterLeakService()
    emitStateUpdate('sensor1', 'on')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: true; Alarm: true',
      'red',
    )
    emitStateUpdate('sensor1', 'off')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: false; Alarm: true',
      'red',
    )
    emitStateUpdate(Entities.inputBoolean.security.waterLeakMonitoring, 'off')
    emitStateUpdate(Entities.inputBoolean.security.waterLeakMonitoring, 'on')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: false; Alarm: false',
      'green',
    )
  })

  it('should disable alarm if the alert toggle is off', () => {
    const service = new WaterLeakService()
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    emitStateUpdate(Entities.inputBoolean.security.waterLeakMonitoring, 'off')
    emitStateUpdate('sensor1', 'on')
    emitStateUpdate('sensor2', 'on')
    checkServiceStatus(
      service,
      'Sensor count: 2; Leak detected: true; Alarm: false',
      'green',
    )
    expect(notificationMock).toBeCalledWith({
      id: 'waterLeak',
      enabled: false,
      extraInfo: '',
    })
  })
})
