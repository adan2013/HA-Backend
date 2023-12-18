import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

mockEntity('sensor', 'on')

describe('InputBooleanEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = Entity.toggle('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('on')
  })

  it('should call onChange callback on "on" or "off" event', () => {
    const onChange = jest.fn()
    const entity = Entity.toggle('sensor')
    entity.onChange(onChange)
    emitStateUpdate('sensor', 'unavailable')
    emitStateUpdate('sensor', 'unknown')
    emitStateUpdate('sensor', 'something')
    expect(onChange).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'off')
    expect(onChange).toHaveBeenCalledWith(false)
    emitStateUpdate('sensor', 'on')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('should not call any service if entity is unavailable', () => {
    const callServiceMock = jest.fn()
    serviceCall.on(callServiceMock)
    mockEntity('sensor', 'unavailable')
    const entity = Entity.toggle('sensor')
    entity.turnOn()
    entity.turnOff()
    entity.toggle()
    expect(callServiceMock).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'off')
    entity.turnOn()
    entity.turnOff()
    entity.toggle()
    expect(callServiceMock).toHaveBeenCalledTimes(3)
  })
})
