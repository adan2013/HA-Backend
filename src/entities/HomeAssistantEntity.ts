import { EntityState } from '../connectors/types'
import { entityStateRequest, entityUpdate } from '../events/events'

export type EntityExtraOptions = {
  initialState?: EntityState
  subscribeToUpdates?: boolean
}

class HomeAssistantEntity {
  readonly entityId: string
  readonly options: EntityExtraOptions
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

  get linkQuality(): number | undefined {
    return this.state?.attributes.linkquality
  }

  get batteryLevel(): number | undefined {
    return this.state?.attributes.battery
  }

  constructor(entityId: string, options?: EntityExtraOptions) {
    this.entityId = entityId
    this.options = {
      initialState: undefined,
      subscribeToUpdates: true,
      ...options,
    }
    if (this.options.initialState) {
      this.state = this.options.initialState
      this.subscribeToUpdates()
    } else {
      entityStateRequest.emit({
        entityId,
        callback: (firstStateUpdate) => {
          this.state = firstStateUpdate
          this.subscribeToUpdates()
        },
      })
    }
  }

  private subscribeToUpdates() {
    if (!this.options.subscribeToUpdates) return
    this.onAnyStateUpdate((newState) => {
      this.state = newState
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
