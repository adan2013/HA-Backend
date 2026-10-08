import Service from '../Service'
import Entity from '../../entities/Entity'
import DebouncedNumericToggle from '../../helpers/DebouncedNumericToggle'
import { notifications } from '../../events/events'
import Entities from '../../configs/entities.config'

export const washingMachinePlugPowerId =
  Entities.sensor.power.washingMachine.power

class WashingMachineController extends Service {
  private washingMachinePower = Entity.general(washingMachinePlugPowerId)
  private debouncedWashingMachineState = new DebouncedNumericToggle({
    name: 'washingMachine',
    threshold: 10,
    onDelay: 300000,
    offDelay: 300000,
    onToggleOn: () => this.setWashingMachineNotification(false),
    onToggleOff: () => this.setWashingMachineNotification(true),
  })

  constructor() {
    super('washingMachineController')
    this.registerHelper(this.debouncedWashingMachineState)
    this.setWashingMachineNotification(false)
    this.listenOnPowerConsumption()
  }

  private setWashingMachineNotification(show: boolean) {
    notifications.emit({
      id: 'loadedWashingMachine',
      enabled: show,
    })
  }

  private listenOnPowerConsumption() {
    this.washingMachinePower.onAnyStateUpdate((powerState) => {
      if (this.washingMachinePower.isUnavailable) return
      this.debouncedWashingMachineState.inputValue(Number(powerState.state))
    })
  }
}

export default WashingMachineController
