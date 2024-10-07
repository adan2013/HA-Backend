import WaterLeakService from './WaterLeakService'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { notifications } from '../../events/events'
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
    enabled: true,
    message: msg,
    color,
  })
}

describe('WaterLeakService', () => {
  beforeEach(() => {
    mockEntity(Entities.inputBoolean.security.waterLeakMonitoring, 'on')
    mockEntity('sensor1', 'off')
    mockEntity('sensor2', 'off')
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
