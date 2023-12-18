import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

class SwitchEntity extends HomeAssistantEntity {
  constructor(entityId: string) {
    super(entityId)
  }

  public turnOn() {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'switch',
      service: 'turn_on',
    })
  }

  public turnOff() {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'switch',
      service: 'turn_off',
    })
  }

  public toggle() {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'switch',
      service: 'toggle',
    })
  }

  public onChange(callback: (switchState: boolean) => void) {
    this.onAnyStateUpdate((state) => {
      if (state?.state === 'on') {
        callback(true)
      } else if (state?.state === 'off') {
        callback(false)
      }
    })
  }
}

export default SwitchEntity
