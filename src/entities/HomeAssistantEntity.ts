import { EntityState } from '../connectors/types'
import { entityStateRequest, entityUpdate } from '../events/events'

class HomeAssistantEntity {
  readonly entityId: string
  state: EntityState | undefined

  get isUnavailable(): boolean {
    return (
      !this.state ||
      this.state.state === 'unavailable' ||
      this.state.state === 'unknown'
    )
  }

  get isOn(): boolean {
    return !this.isUnavailable && this.state?.state === 'on'
  }

  get isOff(): boolean {
    return !this.isUnavailable && this.state?.state === 'off'
  }

  get isWireless(): boolean {
    return !!this.state?.attributes.linkquality
  }

  get isBatteryPowered(): boolean {
    return !!this.state?.attributes.battery
  }

  constructor(entityId: string) {
    this.entityId = entityId
    entityStateRequest.emit({
      entityId,
      callback: (initialState) => {
        this.state = initialState
        this.onAnyStateUpdate((newState) => {
          this.state = newState
        })
      },
    })
  }

  public onAnyStateUpdate(callback: (entity: EntityState) => void) {
    entityUpdate(this.entityId).on(callback)
  }

  public onStateValue(state: string, callback: (entity: EntityState) => void) {
    this.onAnyStateUpdate((entity) => {
      if (entity?.state === state) {
        callback(entity)
      }
    })
  }
}

export default HomeAssistantEntity
