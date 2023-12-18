import HomeAssistantEntity from './HomeAssistantEntity'

type PressType = 'single' | 'double' | 'triple' | 'hold' | 'release'

class AqaraOppleRemoteEntity extends HomeAssistantEntity {
  constructor(entityId: string) {
    super(entityId)
  }

  public onPressType(button: number, type: PressType, callback: () => void) {
    this.onStateValue(`button_${button}_${type}`, callback)
  }

  public onSinglePress(button: number, callback: () => void) {
    this.onPressType(button, 'single', callback)
  }

  public onDoublePress(button: number, callback: () => void) {
    this.onPressType(button, 'double', callback)
  }

  public onTriplePress(button: number, callback: () => void) {
    this.onPressType(button, 'triple', callback)
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
    this.onPressType(button, 'hold', callback)
  }

  public onReleasePress(button: number, callback: () => void) {
    this.onPressType(button, 'release', callback)
  }
}

export default AqaraOppleRemoteEntity
