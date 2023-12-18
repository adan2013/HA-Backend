import HomeAssistantEntity from './HomeAssistantEntity'

export type PressType = 'single' | 'double' | 'triple' | 'hold' | 'release'

export type ActionType = {
  button: number
  type: PressType
}

type Subscriber = {
  action: ActionType
  callback: (action: ActionType) => void
}

class AqaraOppleRemoteEntity extends HomeAssistantEntity {
  private subscribers: Subscriber[] = []

  constructor(entityId: string) {
    super(entityId)
    this.onAnyStateUpdate((state) =>
      this.emitAction(this.decodeState(state.state)),
    )
    // TODO incoming message event
  }

  public decodeState(state = ''): ActionType | null {
    const splited = state.split('_')
    if (splited.length === 3 && splited[0] === 'button') {
      return {
        button: parseInt(splited[1]),
        type: splited[2] as PressType,
      }
    }
    return null
  }

  private emitAction(action: ActionType | null) {
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

  private subscribe(
    action: ActionType,
    callback: (action: ActionType) => void,
  ) {
    this.subscribers.push({ action, callback })
  }

  public onSinglePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'single' }, callback)
  }

  public onDoublePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'double' }, callback)
  }

  public onTriplePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'triple' }, callback)
  }

  public onAnyShortPressCount(
    button: number,
    callback: (type: PressType) => void,
  ) {
    this.onSinglePress(button, () => callback('single'))
    this.onDoublePress(button, () => callback('double'))
    this.onTriplePress(button, () => callback('triple'))
  }

  public onHoldPress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'hold' }, callback)
  }

  public onReleasePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'release' }, callback)
  }
}

export default AqaraOppleRemoteEntity
