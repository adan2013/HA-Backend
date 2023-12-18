import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

mockEntity('sensor', '2023-05-07')
jest.useFakeTimers().setSystemTime(new Date('2023-08-04T21:18:25.327Z'))

describe('InputDateTimeEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = Entity.dateTime('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('2023-05-07')
    const dateObject = new Date('2023-05-07')
    expect(entity.dateValue?.getTime()).toBe(dateObject.getTime())
  })

  it('should return the number of days to deadline', () => {
    const entity = Entity.dateTime('sensor')
    expect(entity.daysToDeadline(60)).toBe(-29)
    expect(entity.daysToDeadline(80)).toBe(-9)
    expect(entity.daysToDeadline(88)).toBe(-1)
    expect(entity.daysToDeadline(89)).toBe(-0)
    expect(entity.daysToDeadline(90)).toBe(1)
    expect(entity.daysToDeadline(100)).toBe(11)
  })

  it('should return 0 days to deadline if entity is unavailable', () => {
    mockEntity('sensor', 'unavailable')
    const entity = Entity.dateTime('sensor')
    expect(entity.daysToDeadline(200)).toBe(0)
  })

  it('should call service only if entity is available', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('sensor', 'unavailable')
    const entity = Entity.dateTime('sensor')
    entity.setDate()
    expect(serviceCallMock).not.toHaveBeenCalled()
    emitStateUpdate('sensor', '2023-08-08')
    entity.setDate()
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'input_datetime',
      service: 'set_datetime',
      data: {
        datetime: '2023-08-04T21:18:25.327Z',
      },
    })
  })
})
