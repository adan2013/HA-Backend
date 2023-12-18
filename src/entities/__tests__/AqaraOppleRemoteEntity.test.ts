import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'

mockEntity('sensor', 'None')

const emitAllStateUpdates = () => {
  emitStateUpdate('sensor', 'button_1_single')
  emitStateUpdate('sensor', 'button_2_double')
  emitStateUpdate('sensor', 'button_3_triple')
  emitStateUpdate('sensor', 'button_4_hold')
  emitStateUpdate('sensor', 'button_4_release')
  emitStateUpdate('sensor', 'button_5_single')
  emitStateUpdate('sensor', 'button_5_double')
  emitStateUpdate('sensor', 'button_5_triple')
  emitStateUpdate('sensor', 'button_5_hold')
  emitStateUpdate('sensor', 'button_5_release')
  emitStateUpdate('sensor', 'None')
  emitStateUpdate('sensor', 'unknown')
  emitStateUpdate('sensor', 'unavailable')
}

describe('AqaraOppleRemoteEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = Entity.aqaraOpple('sensor')
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('None')
  })

  it.each([
    ['onSinglePress', 2],
    ['onDoublePress', 2],
    ['onTriplePress', 2],
    ['onAnyShortPressCount', 6],
    ['onHoldPress', 2],
    ['onReleasePress', 2],
  ])('should trigger %s callback %i times', (functionName, callCount) => {
    const callback = jest.fn()
    const entity = Entity.aqaraOpple('sensor')
    for (let i = 1; i < 6; i++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      entity[functionName](i, callback)
    }
    emitAllStateUpdates()
    expect(callback).toHaveBeenCalledTimes(callCount)
  })
})
