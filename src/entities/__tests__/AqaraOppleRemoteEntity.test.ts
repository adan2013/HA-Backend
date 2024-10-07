import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'

mockEntity('aqaraSensor', 'None')

const emitAllStateUpdates = () => {
  emitStateUpdate('aqaraSensor', 'button_1_single')
  emitStateUpdate('aqaraSensor', 'button_2_double')
  emitStateUpdate('aqaraSensor', 'button_3_triple')
  emitStateUpdate('aqaraSensor', 'button_4_hold')
  emitStateUpdate('aqaraSensor', 'button_4_release')
  emitStateUpdate('aqaraSensor', 'button_5_single')
  emitStateUpdate('aqaraSensor', 'button_5_double')
  emitStateUpdate('aqaraSensor', 'button_5_triple')
  emitStateUpdate('aqaraSensor', 'button_5_hold')
  emitStateUpdate('aqaraSensor', 'button_5_release')
  emitStateUpdate('aqaraSensor', 'None')
  emitStateUpdate('aqaraSensor', 'unknown')
  emitStateUpdate('aqaraSensor', 'unavailable')
}

describe('AqaraOppleRemoteEntity', () => {
  it.each([
    ['onSinglePress', 2],
    ['onDoublePress', 2],
    ['onTriplePress', 2],
    ['onAnyShortPressCount', 6],
    ['onHoldPress', 2],
    ['onReleasePress', 2],
  ])('should trigger %s callback %i times', (functionName, callCount) => {
    const callback = jest.fn()
    const entity = Entity.aqaraOppleRemote('aqaraSensor')
    for (let i = 1; i < 6; i++) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      entity[functionName](i, callback)
    }
    emitAllStateUpdates()
    expect(callback).toHaveBeenCalledTimes(callCount)
  })

  it('sould decode action type from entity state', () => {
    const decode = Entity.aqaraOppleRemote('aqaraSensor').decodeState
    expect(decode('button_1_single')).toEqual({ button: 1, type: 'single' })
    expect(decode('button_2_double')).toEqual({ button: 2, type: 'double' })
    expect(decode('button_3_triple')).toEqual({ button: 3, type: 'triple' })
    expect(decode('button_4_hold')).toEqual({ button: 4, type: 'hold' })
    expect(decode('button_5_release')).toEqual({ button: 5, type: 'release' })
    expect(decode('None')).toEqual(null)
    expect(decode(undefined)).toEqual(null)
  })
})
