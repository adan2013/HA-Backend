import Service from '../Service'
import Entity from '../../entities/Entity'
import LightEntity from '../../entities/LightEntity'
import { BrightnessLevels, LightConfig } from './types'
import Entities from '../../configs/entities.config'

class LivingRoomController extends Service {
  private readonly cabinetLevels: BrightnessLevels = [200, 60, 255]
  private readonly tableLevels: BrightnessLevels = [90, 160, 255]
  private readonly tvLevels: BrightnessLevels = [255, 255, 255]
  private readonly backSectionLevels: BrightnessLevels = [160, 70, 220]
  private readonly frontSectionLevels: BrightnessLevels = [160, 80, 255]
  private remote = Entity.aqaraOppleRemote(Entities.sensor.livingRoom.remote)
  private cabinetLight = Entity.monoLight(Entities.light.livingRoom.cabinet)
  private tableLight = Entity.monoLight(Entities.light.livingRoom.table)
  private tvLight = Entity.monoLight(Entities.light.livingRoom.tv)
  private backSection = Entity.monoLight(
    Entities.light.livingRoom.backCeilingSection,
  )
  private frontSection = Entity.monoLight(
    Entities.light.livingRoom.frontCeilingSection,
  )

  constructor() {
    super('livingRoomController')
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
    this.mapRemoteBtnToLight(5, {
      levels: this.cabinetLevels,
      toTurnOn: [this.cabinetLight],
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
    if (this.isDisabled) return
    const lightsToTurnOnAlreadySet = toTurnOn.every(
      (entity) => Math.abs(entity.brightness - brightnessLevel) <= 3,
    )
    const lightsToTurnOffAlreadySet = toTurnOff.every(
      (entity) => entity.state?.state === 'off',
    )
    const lightsAlreadySet =
      lightsToTurnOnAlreadySet && lightsToTurnOffAlreadySet
    if (toTurnOn.length) {
      const extraIdsToTurnOn = toTurnOn.slice(1).map((e) => e.entityId)
      if (lightsAlreadySet) {
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
    if (this.isDisabled) return
    this.tableLight.turnOff([
      this.tvLight.entityId,
      this.backSection.entityId,
      this.frontSection.entityId,
      this.cabinetLight.entityId,
    ])
  }
}

export default LivingRoomController
