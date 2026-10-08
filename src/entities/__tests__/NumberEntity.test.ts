import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

describe('NumberEntity', () => {
  afterEach(() => {
    serviceCall.resetListeners()
  })

  it('reads a numeric value', () => {
    mockEntity('number.test', '21.5')
    const entity = Entity.number('number.test')

    expect(entity.numericValue).toBe(21.5)
    emitStateUpdate('number.test', 'unavailable')
    expect(entity.numericValue).toBeNull()
    emitStateUpdate('number.test', 'abc')
    expect(entity.numericValue).toBeNull()
  })

  it('sets a number value only when the entity is available', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('number.test', 'unavailable')
    const entity = Entity.number('number.test')

    entity.setValue(22.4)
    expect(serviceCallMock).not.toHaveBeenCalled()

    emitStateUpdate('number.test', '20')
    entity.setValue(22.4)
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'number.test',
      domain: 'number',
      service: 'set_value',
      data: { value: 22.4 },
    })
  })
})
