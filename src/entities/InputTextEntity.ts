import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

class InputTextEntity extends HomeAssistantEntity {
  get textValue(): string | null {
    if (this.isUnavailable) return null
    return this.state?.state || null
  }

  public setValue(value: string) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'input_text',
      service: 'set_value',
      data: { value },
    })
  }

  public onChange(callback: (value: string | null) => void) {
    return this.onAnyStateUpdate((state) => {
      const isUnavailable =
        state.state === 'unavailable' || state.state === 'unknown'
      callback(isUnavailable ? null : state.state)
    })
  }
}

export default InputTextEntity
