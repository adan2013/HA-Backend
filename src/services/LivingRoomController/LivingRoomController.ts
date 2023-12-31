import Service from '../Service'
import Entity from '../../entities/Entity'
import LightEntity from '../../entities/LightEntity'
import { BrightnessLevels, LightConfig } from './types'

class LivingRoomController extends Service {
  private readonly tableLevels: BrightnessLevels = [90, 160, 255]
  private readonly tvLevels: BrightnessLevels = [255, 255, 255]
  private readonly backSectionLevels: BrightnessLevels = [130, 76, 220]
  private readonly frontSectionLevels: BrightnessLevels = [160, 62, 255]
  private remote = Entity.aqaraOpple('sensor.livingroomremote_action')
  private tableLight = Entity.monoLight('light.tablelight')
  private tvLight = Entity.monoLight('light.tvlight')
  private backSection = Entity.monoLight('light.livingroombacklight')
  private frontSection = Entity.monoLight('light.livingroomfrontlight')

  constructor() {
    super('LivingRoomController')
    this.mapRemoteBtnToLight(1, {
      levels: this.backSectionLevels,
      toTurnOn: [this.backSection],
      toTurnOff: [this.frontSection],
    })
    this.mapRemoteBtnToLight(2, {
      levels: this.frontSectionLevels,
      toTurnOn: [this.frontSection, this.backSection],
    })
    this.mapRemoteBtnToLight(3, {
      levels: this.tvLevels,
      toTurnOn: [this.tvLight],
    })
    this.mapRemoteBtnToLight(4, {
      levels: this.tableLevels,
      toTurnOn: [this.tableLight],
    })
    this.remote.onAnyShortPressCount(6, () => this.turnOffAllLights())
  }

  public mapRemoteBtnToLight(button: number, config: LightConfig) {
    this.remote.onSinglePress(button, () =>
      this.switchLight(config.levels[0], config.toTurnOn, config.toTurnOff),
    )
    this.remote.onDoublePress(button, () =>
      this.switchLight(config.levels[1], config.toTurnOn, config.toTurnOff),
    )
    this.remote.onHoldPress(button, () =>
      this.switchLight(config.levels[2], config.toTurnOn, config.toTurnOff),
    )
  }

  public switchLight(
    brightnessLevel: number,
    toTurnOn: LightEntity[] = [],
    toTurnOff: LightEntity[] = [],
  ) {
    const brightnessIsAlreadySet = toTurnOn.every(
      (entity) => entity.brightness === brightnessLevel,
    )
    if (toTurnOn.length) {
      const extraIdsToTurnOn = toTurnOn.slice(1).map((e) => e.entityId)
      if (brightnessIsAlreadySet) {
        toTurnOn[0].turnOff(extraIdsToTurnOn)
      } else {
        toTurnOn[0].turnOn(brightnessLevel, extraIdsToTurnOn)
      }
    }
    if (toTurnOff.length) {
      const extraIdsToTurnOff = toTurnOff.slice(1).map((e) => e.entityId)
      toTurnOff[0].turnOff(extraIdsToTurnOff)
    }
  }

  public turnOffAllLights() {
    this.tableLight.turnOff([
      this.tvLight.entityId,
      this.backSection.entityId,
      this.frontSection.entityId,
    ])
  }
}

export default LivingRoomController
