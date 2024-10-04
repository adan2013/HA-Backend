import HomeAssistantEntity from './HomeAssistantEntity'
import { webSocketMessage } from '../events/events'
import WS_CMD from '../connectors/wsCommands'

export type ActionType<PressType> = {
  button: number
  type: PressType
}

type Subscriber<PressType> = {
  action: ActionType<PressType>
  callback: (action: ActionType<PressType>) => void
}

class RemoteEntity<PressType> extends HomeAssistantEntity {
  protected subscribers: Subscriber<PressType>[] = []

  constructor(entityId: string) {
    super(entityId)
    this.onAnyStateUpdate((state) =>
      this.emitAction(this.decodeState(state.state)),
    )
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).on(
      ({ message: { id, value } }) => {
        if (id && value && id === this.entityId) {
          this.emitAction(this.decodeState(value))
        }
      },
    )
  }

  private emitAction(action: ActionType<PressType> | null) {
    if (!action) return
    this.subscribers.forEach((subscriber) => {
      if (
        subscriber.action.button === action.button &&
        subscriber.action.type === action.type
      ) {
        subscriber.callback(action)
      }
    })
  }

  public decodeState(state = ''): ActionType<PressType> | null {
    console.error('remote state decoder not implemented', this.entityId, state)
    throw new Error('remote state decoder not implemented')
  }

  public subscribe(
    action: ActionType<PressType>,
    callback: (action: ActionType<PressType>) => void,
  ) {
    this.subscribers.push({ action, callback })
  }
}

export default RemoteEntity
