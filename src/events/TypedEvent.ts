import ee from './EventEmitterHub'

class TypedEvent<T> {
  readonly eventName: string

  constructor(eventName: string, channel?: string) {
    this.eventName = channel ? `${eventName}/${channel}` : eventName
  }

  public on(callback: (payload: T) => void) {
    ee.on(this.eventName, callback)
  }

  public once(callback: (payload: T) => void) {
    ee.once(this.eventName, callback)
  }

  public emit(payload: T) {
    ee.emit(this.eventName, payload)
  }

  public resetListeners() {
    ee.removeAllListeners()
  }
}

export default TypedEvent
