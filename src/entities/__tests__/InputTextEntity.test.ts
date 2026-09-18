import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

describe('InputTextEntity', () => {
  afterEach(() => {
    serviceCall.resetListeners()
  })

  it('reads and subscribes to a text helper value', () => {
    mockEntity('input_text.schedule', '09:00-15:00')
    const entity = Entity.inputText('input_text.schedule')
    const onChange = jest.fn()
    entity.onChange(onChange)

    expect(entity.textValue).toBe('09:00-15:00')
    emitStateUpdate('input_text.schedule', '10:30-16:45')
    expect(entity.textValue).toBe('10:30-16:45')
    expect(onChange).toHaveBeenCalledWith('10:30-16:45')
  })

  it('sets a text helper value only when the entity is available', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('input_text.schedule', 'unavailable')
    const entity = Entity.inputText('input_text.schedule')

    entity.setValue('09:00-15:00')
    expect(serviceCallMock).not.toHaveBeenCalled()

    emitStateUpdate('input_text.schedule', '10:00-16:00')
    entity.setValue('09:00-15:00')
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'input_text.schedule',
      domain: 'input_text',
      service: 'set_value',
      data: { value: '09:00-15:00' },
    })
  })
})
