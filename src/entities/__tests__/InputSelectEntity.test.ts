import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

mockEntity('sensor', 'option1')

describe('InputSelectEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = Entity.select('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('option1')
  })

  it('should call service only if entity is available', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('sensor', 'unavailable')
    const entity = Entity.select('sensor')
    entity.setOption('option2')
    expect(serviceCallMock).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'option3')
    entity.setOption('option4')
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'input_select',
      service: 'select_option',
      data: {
        option: 'option4',
      },
    })
  })
})
