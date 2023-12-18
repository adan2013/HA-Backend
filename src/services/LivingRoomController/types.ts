import LightEntity from '../../entities/LightEntity'

export type BrightnessLevels = [number, number, number]

export type LightConfig = {
  levels: BrightnessLevels
  toTurnOn?: LightEntity[]
  toTurnOff?: LightEntity[]
}
