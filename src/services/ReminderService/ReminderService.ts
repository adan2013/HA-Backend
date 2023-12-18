import Service from '../Service'
import Entity from '../../entities/Entity'
import DebouncedNumericToggle from '../../helpers/DebouncedNumericToggle'
import { notifications } from '../../events/events'

class ReminderService extends Service {
  private readonly washingMachinePower = Entity.general(
    'sensor.washingmachineplug_power',
  )
  private readonly washingMachineState = Entity.select(
    'input_select.washingmachinestate',
  )

  constructor() {
    super('reminder')
    this.initializeWashingMachineWatchdog()
  }

  private initializeWashingMachineWatchdog() {
    const setWashingMachineState = (isWorking: boolean) => {
      if (this.isDisabled) return
      this.washingMachineState.setOption(isWorking ? 'WORKING' : 'LOADED')
    }
    const debouncedWashingMachineState = new DebouncedNumericToggle({
      name: 'washingMachine',
      threshold: 10,
      onDelay: 60000,
      offDelay: 300000,
      onToggleOn: () => setWashingMachineState(true),
      onToggleOff: () => setWashingMachineState(false),
    })
    this.registerHelper(debouncedWashingMachineState)
    this.washingMachineState.setOption('EMPTY')
    this.washingMachinePower.onAnyStateUpdate((powerState) => {
      if (this.washingMachinePower.isUnavailable) return
      debouncedWashingMachineState.inputValue(Number(powerState.state))
    })
    this.washingMachineState.onAnyStateUpdate((wmState) => {
      if (this.isDisabled) return
      notifications.emit({
        id: 'loadedWashingMachine',
        enabled: wmState.state === 'LOADED',
      })
    })
  }
}

export default ReminderService
