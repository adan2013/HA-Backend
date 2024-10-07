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

const externalButtons = {
  danielRoom: {
    on: '1_single',
    off: '3_single',
  },
  kitchen: {
    on: '2_single',
    off: '3_single',
  },
  livingRoom: {
    on: '2_double',
    off: '6_single',
  },
}

class DanielRoomController extends Service {
  private bedRemote = Entity.tuyaRemote(Entities.sensor.remote.danielBed)
  private bedLight = Entity.cctLight(Entities.light.danielRoom.bedLamp)

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
    this.bedRemote.onDoublePress(4, () => this.turnOnAllLights())
    this.bedRemote.onHoldPress(4, () => this.turnOffAllLights())
  }

  private triggerAnotherRemote(remoteId: string, button: string) {
    webSocketMessage(WS_CMD.incoming.REMOTE_CONTROL).emit({
      message: {
        id: remoteId,
        value: button,
      },
      sendResponse: () => null,
    })
  }

  private turnOnAllLights() {
    this.triggerAnotherRemote(
      Entities.sensor.remote.danielBed,
      externalButtons.danielRoom.on,
    )
    this.triggerAnotherRemote(
      Entities.sensor.remote.kitchen,
      externalButtons.kitchen.on,
    )
    this.triggerAnotherRemote(
      Entities.sensor.remote.livingRoom,
      externalButtons.livingRoom.on,
    )
  }

  private turnOffAllLights() {
    this.triggerAnotherRemote(
      Entities.sensor.remote.danielBed,
      externalButtons.danielRoom.off,
    )
    this.triggerAnotherRemote(
      Entities.sensor.remote.kitchen,
      externalButtons.kitchen.off,
    )
    this.triggerAnotherRemote(
      Entities.sensor.remote.livingRoom,
      externalButtons.livingRoom.off,
    )
  }
}

export default DanielRoomController
