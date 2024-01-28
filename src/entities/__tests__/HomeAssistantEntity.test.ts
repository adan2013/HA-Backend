import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { entityStateRequest } from '../../events/events'

describe('HomeAssistantEntity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEntity('sensor', 'on', {
      battery: 53,
      linkquality: 30,
    })
  })

  it('should create an instance add fetch the entity state', () => {
    const entityStateRequestSpy = jest.spyOn(entityStateRequest, 'emit')
    const entity = Entity.general('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('on')
    expect(entityStateRequestSpy).toHaveBeenCalledTimes(1)
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
      expect(entity.batteryLevel).toBe(53)
      expect(entity.linkQuality).toBe(30)
    },
  )

  it('should initialize with initial state and subscribe to updates', () => {
    const entityStateRequestSpy = jest.spyOn(entityStateRequest, 'emit')
    const entity = Entity.general('sensor', {
      initialState: {
        id: 'sensor',
        state: 'customState',
        lastChanged: '',
        lastUpdated: '',
        attributes: {
          friendly_name: `entityName`,
        },
      },
    })
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('customState')
    expect(entityStateRequestSpy).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'updatedState')
    expect(entity.state?.state).toBe('updatedState')
  })

  it('should not subscribe to updates', () => {
    const entity = Entity.general('sensor', {
      subscribeToUpdates: false,
    })
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('on')
    emitStateUpdate('sensor', 'updatedState')
    expect(entity.state?.state).toBe('on')
  })

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
