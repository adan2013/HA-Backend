import Service from '../Service'
import Entity from '../../entities/Entity'
import Timer from '../../Timer'
import Entities from '../../configs/entities.config'

class BalconyController extends Service {
  private readonly TURN_ON_AT = 16
  private readonly TURN_OFF_AT = 22
  private autoToggle = Entity.toggle(
    Entities.inputBoolean.automations.balconyAutoLights,
  )
  private balconyLightPlug = Entity.switch(Entities.switch.plug.balconyLights)

  constructor() {
    super('balconyController')
    Timer.onTime(this.TURN_ON_AT, 0, () => this.switchBalconyLight(true))
    Timer.onTime(this.TURN_OFF_AT, 0, () => this.switchBalconyLight(false))
  }

  public switchBalconyLight(on: boolean) {
    if (this.isDisabled) return
    if (this.autoToggle.isOn) {
      if (on) {
        this.balconyLightPlug.turnOn()
      } else {
        this.balconyLightPlug.turnOff()
      }
    }
  }
}

export default BalconyController
