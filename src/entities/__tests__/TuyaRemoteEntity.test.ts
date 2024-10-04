import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'

mockEntity('tuyaSensor', 'None')

const emitAllStateUpdates = () => {
  emitStateUpdate('tuyaSensor', '1_single')
  emitStateUpdate('tuyaSensor', '1_double')
  emitStateUpdate('tuyaSensor', '1_hold')
  emitStateUpdate('tuyaSensor', '2_single')
  emitStateUpdate('tuyaSensor', '2_double')
  emitStateUpdate('tuyaSensor', '3_single')
  emitStateUpdate('tuyaSensor', 'None')
  emitStateUpdate('tuyaSensor', 'unknown')
  emitStateUpdate('tuyaSensor', 'unavailable')
}

describe('TuyaRemoteEntity', () => {
  it.each([
    ['onSinglePress', 3],
    ['onDoublePress', 2],
    ['onAnyShortPressCount', 5],
    ['onHoldPress', 1],
  ])('should trigger %s callback %i times', (functionName, callCount) => {
    const callback = jest.fn()
    const entity = Entity.tuyaRemote('tuyaSensor')
    for (let i = 1; i < 6; i++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      entity[functionName](i, callback)
    }
    emitAllStateUpdates()
    expect(callback).toHaveBeenCalledTimes(callCount)
  })

  it('sould decode action type from entity state', () => {
    const decode = Entity.tuyaRemote('tuyaSensor').decodeState
    expect(decode('1_single')).toEqual({ button: 1, type: 'single' })
    expect(decode('2_double')).toEqual({ button: 2, type: 'double' })
    expect(decode('3_hold')).toEqual({ button: 3, type: 'hold' })
    expect(decode('None')).toEqual(null)
    expect(decode(undefined)).toEqual(null)
  })
})
