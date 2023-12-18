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

  public turnOn(brightness?: number) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'light',
      service: 'turn_on',
      data: {
        brightness,
      },
    })
  }

  public turnOff() {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'light',
      service: 'turn_off',
    })
  }

  public toggle() {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
      domain: 'light',
      service: 'toggle',
    })
  }

  public setBrightness(brightness: number) {
    if (brightness > 0) {
      this.turnOn(brightness)
    } else {
      this.turnOff()
    }
  }

  public setTemperature(kelvin: number) {
    if (this.isUnavailable) return
    if (this.lightType === 'cct') {
      serviceCall.emit({
        entityId: this.entityId,
        domain: 'light',
        service: 'turn_on',
        data: {
          kelvin,
        },
      })
    }
  }

  public setColor(r: number, g: number, b: number) {
    if (this.isUnavailable) return
    if (this.lightType === 'rgb') {
      serviceCall.emit({
        entityId: this.entityId,
        domain: 'light',
        service: 'turn_on',
        data: {
          rgb_color: [r, g, b],
        },
      })
    }
  }

  public setEffect(effect: string) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.entityId,
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
