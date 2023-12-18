import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

class InputDateTimeEntity extends HomeAssistantEntity {
  get dateValue(): Date | null {
    if (this.isUnavailable) return null
    return new Date(this.state?.state || '')
  }

  constructor(entityId: string) {
    super(entityId)
  }

  public daysToDeadline(days: number): number {
    const today = new Date()
    const deadline = this.dateValue
    if (deadline) {
      deadline.setDate(deadline.getDate() + days)
      return Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
    }
    return 0
  }

  public setDate(date = new Date()) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'input_datetime',
      service: 'set_datetime',
      data: {
        datetime: date.toISOString(),
      },
    })
  }
}

export default InputDateTimeEntity
