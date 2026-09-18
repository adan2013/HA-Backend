import Service from '../Service'
import Entity from '../../entities/Entity'
import Entities from '../../configs/entities.config'
import TimeRangeSchedule from '../../scheduling/TimeRangeSchedule'

class BalconyController extends Service {
  private autoToggle = Entity.toggle(
    Entities.inputBoolean.automations.balconyCircuitAutoSwitch,
  )
  private balconySwitch = Entity.switch(Entities.switch.circuit.balcony)
  private schedule: TimeRangeSchedule

  constructor() {
    super('balconyController')
    this.schedule = new TimeRangeSchedule(
      Entity.inputText(Entities.inputText.schedule.balconyCircuit),
      () => this.switchBalconyLight(true),
      () => this.switchBalconyLight(false),
    )
  }

  public switchBalconyLight(on: boolean) {
    if (this.autoToggle.isOn) {
      if (on) {
        this.balconySwitch.turnOn()
      } else {
        this.balconySwitch.turnOff()
      }
    }
  }
}

export default BalconyController
