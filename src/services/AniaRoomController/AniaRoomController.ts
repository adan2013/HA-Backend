import Service from '../Service'
import Entity from '../../entities/Entity'
import Entities from '../../configs/entities.config'
import { webSocketMessage } from '../../events/events'
import WS_CMD from '../../connectors/wsCommands'

const warmTemperature = 2000
const warmNormalBrightness = 90
const warmDimBrightness = 25

const daylightTemperature = 4500
const daylightNormalBrightness = 175
const daylightMaxBrightness = 255

class AniaRoomController extends Service {
  private bedRemote = Entity.tuyaRemote(Entities.sensor.remote.aniaBed)
  private bedLight = Entity.cctLight(Entities.light.aniaRoom.bedLamp)

  constructor() {
    super('aniaRoomController')
    this.bedRemote.onSinglePress(1, () =>
      this.bedLight.setTemperature(
        daylightTemperature,
        daylightNormalBrightness,
      ),
    )
    this.bedRemote.onDoublePress(1, () =>
      this.bedLight.setTemperature(daylightTemperature, daylightMaxBrightness),
    )
    this.bedRemote.onSinglePress(2, () =>
      this.bedLight.setTemperature(warmTemperature, warmNormalBrightness),
    )
    this.bedRemote.onDoublePress(2, () =>
      this.bedLight.setTemperature(warmTemperature, warmDimBrightness),
    )
    this.bedRemote.onAnyShortPressCount(4, () => this.bedLight.turnOff())
  }
}

export default AniaRoomController
