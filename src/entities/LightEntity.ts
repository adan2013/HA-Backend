import HomeAssistantEntity from './HomeAssistantEntity'
import { serviceCall } from '../events/events'

type LightType = 'mono' | 'cct' | 'rgb'

export type LightTurnOnOptions = {
  extraEntities?: string[]
  effect?: string
}

type LightTargetOptions = Pick<LightTurnOnOptions, 'extraEntities'>

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

  private target(extraEntities?: string[]) {
    return extraEntities ? [this.entityId, ...extraEntities] : this.entityId
  }

  private emitTurnOn(
    data: Record<string, unknown>,
    options: LightTurnOnOptions = {},
  ) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.target(options.extraEntities),
      domain: 'light',
      service: 'turn_on',
      data: {
        ...data,
        ...(options.effect ? { effect: options.effect } : {}),
      },
    })
  }

  public turnOn(brightness?: number, options: LightTurnOnOptions = {}) {
    this.emitTurnOn({ brightness }, options)
  }

  public turnOff(extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.target(extraEntities),
      domain: 'light',
      service: 'turn_off',
    })
  }

  public toggle(extraEntities?: string[]) {
    if (this.isUnavailable) return
    serviceCall.emit({
      entityId: this.target(extraEntities),
      domain: 'light',
      service: 'toggle',
    })
  }

  public setBrightness(brightness: number, options: LightTurnOnOptions = {}) {
    if (brightness > 0) {
      this.turnOn(brightness, options)
    } else {
      this.turnOff(options.extraEntities)
    }
  }

  public setTemperature(
    kelvin: number,
    brightness?: number,
    options: LightTurnOnOptions = {},
  ) {
    if (this.lightType === 'cct') {
      this.emitTurnOn(
        {
          color_temp_kelvin: kelvin,
          brightness,
        },
        options,
      )
    }
  }

  public setColor(
    r: number,
    g: number,
    b: number,
    options: LightTurnOnOptions = {},
  ) {
    if (this.lightType === 'rgb') {
      this.emitTurnOn(
        {
          rgb_color: [r, g, b],
        },
        options,
      )
    }
  }

  public setEffect(effect: string, options: LightTargetOptions = {}) {
    this.emitTurnOn({}, { ...options, effect })
  }

  public onLightOn(callback: () => void) {
    this.onStateValue('on', callback)
  }

  public onLightOff(callback: () => void) {
    this.onStateValue('off', callback)
  }
}

export default LightEntity
