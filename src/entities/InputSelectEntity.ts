import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

class InputSelectEntity extends HomeAssistantEntity {
  constructor(entityId: string) {
    super(entityId)
  }

  public setOption(option: string) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'input_select',
      service: 'select_option',
      data: {
        option,
      },
    })
  }
}

export default InputSelectEntity
