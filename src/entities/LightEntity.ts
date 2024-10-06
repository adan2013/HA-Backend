import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

type LightType = 'mono' | 'cct' | 'rgb'

class LightEntity extends HomeAssistantEntity {
  readonly lightType: LightType

  get brightness(): number {
    return this.state?.attributes.brightness || 0
  }

  get temperatureInKelvins(): number {
    return this.state?.attributes.color_temp_kelvin || 0
  }

  get kelvinTemperatureRange(): [number, number] {
    const minColorTemp = this.state?.attributes?.min_color_temp_kelvin || 0
    const maxColorTemp = this.state?.attributes?.max_color_temp_kelvin || 0
    return [minColorTemp, maxColorTemp]
  }

  constructor(entityId: string, lightType: LightType) {
    super(entityId)
    this.lightType = lightType
  }

  public turnOn(brightness?: number, extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: extraEntities
        ? [this.entityId, ...extraEntities]
        : this.entityId,
      domain: 'light',
      service: 'turn_on',
      data: {
        brightness,
      },
    })
  }

  public turnOff(extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: extraEntities
        ? [this.entityId, ...extraEntities]
        : this.entityId,
      domain: 'light',
      service: 'turn_off',
    })
  }

  public toggle(extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: extraEntities
        ? [this.entityId, ...extraEntities]
        : this.entityId,
      domain: 'light',
      service: 'toggle',
    })
  }

  public setBrightness(brightness: number, extraEntities?: string[]) {
    if (brightness > 0) {
      this.turnOn(brightness, extraEntities)
    } else {
      this.turnOff(extraEntities)
    }
  }

  public setTemperature(
    kelvin: number,
    brightness?: number,
    extraEntities?: string[],
  ) {
    if (this.isUnavailable) return
    if (this.lightType === 'cct') {
      serviceCall.emit({
        entityId: extraEntities
          ? [this.entityId, ...extraEntities]
          : this.entityId,
        domain: 'light',
        service: 'turn_on',
        data: {
          kelvin,
          brightness,
        },
      })
    }
  }

  public setColor(r: number, g: number, b: number, extraEntities?: string[]) {
    if (this.isUnavailable) return
    if (this.lightType === 'rgb') {
      serviceCall.emit({
        entityId: extraEntities
          ? [this.entityId, ...extraEntities]
          : this.entityId,
        domain: 'light',
        service: 'turn_on',
        data: {
          rgb_color: [r, g, b],
        },
      })
    }
  }

  public setEffect(effect: string, extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: extraEntities
        ? [this.entityId, ...extraEntities]
        : this.entityId,
      domain: 'light',
      service: 'turn_on',
      data: {
        effect,
      },
    })
  }

  public onLightOn(callback: () => void) {
    this.onStateValue('on', callback)
  }

  public onLightOff(callback: () => void) {
    this.onStateValue('off', callback)
  }
}

export default LightEntity
