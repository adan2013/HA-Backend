import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'

mockEntity('sensor', 'on', {
  battery: 53,
  linkquality: 30,
})

describe('HomeAssistantEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = Entity.general('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('on')
  })

  it.each([
    ['on', true, false, false],
    ['off', false, true, false],
    ['unknown', false, false, true],
    ['unavailable', false, false, true],
  ])(
    'should return correct flags with state %s',
    (state, isOn, isOff, isUnavailable) => {
      mockEntity('sensor', state, {
        battery: 53,
        linkquality: 30,
      })
      const entity = Entity.general('sensor')
      expect(entity.isOn).toBe(isOn)
      expect(entity.isOff).toBe(isOff)
      expect(entity.isUnavailable).toBe(isUnavailable)
      expect(entity.isBatteryPowered).toBeTruthy()
      expect(entity.isWireless).toBeTruthy()
    },
  )

  it('should trigger callback on any state update', () => {
    const callback = jest.fn()
    const entity = Entity.general('sensor')
    entity.onAnyStateUpdate(callback)
    expect(callback).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'off')
    expect(callback).toHaveBeenCalledTimes(1)
    emitStateUpdate('sensor', 'unknown')
    expect(callback).toHaveBeenCalledTimes(2)
    emitStateUpdate('sensor', 'unavailable')
    expect(callback).toHaveBeenCalledTimes(3)
    emitStateUpdate('sensor', 'something')
    expect(callback).toHaveBeenCalledTimes(4)
  })

  it('should trigger callback only on specific state', () => {
    const callback = jest.fn()
    const entity = Entity.general('sensor')
    entity.onStateValue('specialState', callback)
    expect(callback).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'off')
    emitStateUpdate('sensor', 'unknown')
    emitStateUpdate('sensor', 'unavailable')
    emitStateUpdate('sensor', 'something')
    expect(callback).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'specialState')
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
