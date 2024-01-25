import ReminderService from '../../ReminderService'
import Entity from '../../../../entities/Entity'
import DebouncedNumericToggle from '../../../../helpers/DebouncedNumericToggle'
import { notifications } from '../../../../events/events'

export const washingMachinePlugId = 'sensor.washingmachineplug_power'
export const washingMachineStateId = 'input_select.washingmachinestate'

export const initWashingMachineWatchdog = (
  reminderService: ReminderService,
) => {
  const washingMachinePower = Entity.general(washingMachinePlugId)
  const washingMachineState = Entity.select(washingMachineStateId)
  const setWashingMachineState = (isWorking: boolean) => {
    if (reminderService.isDisabled) return
    washingMachineState.setOption(isWorking ? 'WORKING' : 'LOADED')
  }
  const debouncedWashingMachineState = new DebouncedNumericToggle({
    name: 'washingMachine',
    threshold: 10,
    onDelay: 60000,
    offDelay: 300000,
    onToggleOn: () => setWashingMachineState(true),
    onToggleOff: () => setWashingMachineState(false),
  })
  reminderService.registerHelper(debouncedWashingMachineState)
  washingMachineState.setOption('EMPTY')
  washingMachinePower.onAnyStateUpdate((powerState) => {
    if (washingMachinePower.isUnavailable) return
    debouncedWashingMachineState.inputValue(Number(powerState.state))
  })
  washingMachineState.onAnyStateUpdate((wmState) => {
    if (reminderService.isDisabled) return
    notifications.emit({
      id: 'loadedWashingMachine',
      enabled: wmState.state === 'LOADED',
    })
  })
}
