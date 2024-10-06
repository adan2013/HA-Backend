import Service from '../Service'
import Entity from '../../entities/Entity'

const warmTemperature = 3000
const warmNormalBrightness = 100
const warmDimBrightness = 50

const daylightTemperature = 5000
const daylightNormalBrightness = 180
const daylightMaxBrightness = 255

class DanielRoomController extends Service {
  private bedRemote = Entity.tuyaRemote('sensor.danielbedremote_action')
  private bedLight = Entity.cctLight('light.danielbedlamp')

  constructor() {
    super('danielRoomController')
    this.bedRemote.onSinglePress(1, () =>
      this.bedLight.setTemperature(warmTemperature, warmNormalBrightness),
    )
    this.bedRemote.onDoublePress(1, () =>
      this.bedLight.setTemperature(warmTemperature, warmDimBrightness),
    )
    this.bedRemote.onSinglePress(2, () =>
      this.bedLight.setTemperature(
        daylightTemperature,
        daylightNormalBrightness,
      ),
    )
    this.bedRemote.onDoublePress(2, () =>
      this.bedLight.setTemperature(daylightTemperature, daylightMaxBrightness),
    )
    this.bedRemote.onAnyShortPressCount(3, () => this.bedLight.turnOff())
  }
}

export default DanielRoomController
