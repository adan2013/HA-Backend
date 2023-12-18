import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { webSocketMessage } from '../../events/events'
import WS_CMD from '../../connectors/wsCommands'

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

  it('sould decode action type from entity state', () => {
    const decode = Entity.aqaraOpple('sensor').decodeState
    expect(decode('button_1_single')).toEqual({ button: 1, type: 'single' })
    expect(decode('button_2_double')).toEqual({ button: 2, type: 'double' })
    expect(decode('button_3_triple')).toEqual({ button: 3, type: 'triple' })
    expect(decode('button_4_hold')).toEqual({ button: 4, type: 'hold' })
    expect(decode('button_5_release')).toEqual({ button: 5, type: 'release' })
    expect(decode('None')).toEqual(null)
    expect(decode(undefined)).toEqual(null)
  })

  it('should trigger action by remote signal', () => {
    const remote = Entity.aqaraOpple('sensor')
    const callback = jest.fn()
    remote.onDoublePress(4, callback)
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'WRONG_ID',
        value: 'button_4_double',
      },
      sendResponse: jest.fn(),
    })
    expect(callback).not.toHaveBeenCalled()
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'sensor',
        value: 'button_4_single',
      },
      sendResponse: jest.fn(),
    })
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'sensor',
        value: 'button_4_double',
      },
      sendResponse: jest.fn(),
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
