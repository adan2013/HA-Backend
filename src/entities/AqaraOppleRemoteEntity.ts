import RemoteEntity, { ActionType } from './RemoteEntity'

export type AqaraOpplePressType =
  | 'single'
  | 'double'
  | 'triple'
  | 'hold'
  | 'release'

class AqaraOppleRemoteEntity extends RemoteEntity<AqaraOpplePressType> {
  constructor(entityId: string) {
    super(entityId)
  }

  public override decodeState(
    state = '',
  ): ActionType<AqaraOpplePressType> | null {
    const splited = state.split('_')
    if (splited.length === 3 && splited[0] === 'button') {
      return {
        button: parseInt(splited[1]),
        type: splited[2] as AqaraOpplePressType,
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

  public onTriplePress(button: number, callback: () => void) {
    this.subscribe({ button, type: 'triple' }, callback)
  }

  public onAnyShortPressCount(
    button: number,
    callback: (type: AqaraOpplePressType) => void,
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
