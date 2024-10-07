import RemoteEntity, { ActionType } from './RemoteEntity'

export type TuyaPressType = 'single' | 'double' | 'hold'

class TuyaRemoteEntity extends RemoteEntity<TuyaPressType> {
  constructor(entityId: string) {
    super(entityId)
  }

  public override decodeState(state = ''): ActionType<TuyaPressType> | null {
    const splited = state.split('_')
    if (splited.length === 2) {
      return {
        button: parseInt(splited[0]),
        type: splited[1] as TuyaPressType,
      }
    }
    return null
  }

  public onSinglePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'single' }, callback)
  }

  public onDoublePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'double' }, callback)
  }

  public onAnyShortPressCount(
    button: number,
    callback: (type: TuyaPressType) => void,
  ) {
    this.onSinglePress(button, () => callback('single'))
    this.onDoublePress(button, () => callback('double'))
  }

  public onHoldPress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'hold' }, callback)
  }
}

export default TuyaRemoteEntity
