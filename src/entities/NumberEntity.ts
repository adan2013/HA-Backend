import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

class NumberEntity extends HomeAssistantEntity {
  get numericValue(): number | null {
    if (this.isUnavailable) return null
    const value = Number(this.state?.state)
    return Number.isNaN(value) ? null : value
  }

  public setValue(value: number) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'number',
      service: 'set_value',
      data: { value },
    })
  }
}

export default NumberEntity
