import { mockEntity } from '../../utils/testUtils'
import { webSocketMessage } from '../../events/events'
import WS_CMD from '../../connectors/wsCommands'
import RemoteEntity from '../RemoteEntity'

mockEntity('sensor', 'None')

type TestPressTypes = 'single' | 'double'

class TestRemote extends RemoteEntity<TestPressTypes> {
  constructor() {
    super('sensor')
  }

  override decodeState(state: string): {
    button: number
    type: TestPressTypes
  } {
    const [button, type] = state.split('_')
    return { button: parseInt(button), type: type as TestPressTypes }
  }
}

describe('RemoteEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const entity = new TestRemote()
    expect(entity).toBeDefined()
    expect(entity.state?.state).toBe('None')
  })

  it('should trigger action by remote signal', () => {
    const remote = new TestRemote()
    const callback = jest.fn()
    remote.subscribe({ button: 4, type: 'double' }, callback)
    // test case: wrong id
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'WRONG_ID',
        value: '4_double',
      },
      sendResponse: jest.fn(),
    })
    expect(callback).not.toHaveBeenCalled()
    // test case: wrong event payload
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'sensor',
        value: '4_single',
      },
      sendResponse: jest.fn(),
    })
    // test case: invalid payload
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'sensor',
        value: 'invalid_remote_event_payload',
      },
      sendResponse: jest.fn(),
    })
    // test case: correct payload and id
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: 'sensor',
        value: '4_double',
      },
      sendResponse: jest.fn(),
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should throw an error if state decoder is not implemented', () => {
    const remote = new RemoteEntity('sensor')
    expect(() => remote.decodeState('something')).toThrow()
  })
})
