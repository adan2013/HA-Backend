import ReminderService from '../../ReminderService'
import Entity from '../../../../entities/Entity'
import DebouncedNumericToggle from '../../../../helpers/DebouncedNumericToggle'
import { notifications } from '../../../../events/events'
import Entities from '../../../../configs/entities.config'

export const washingMachinePlugPowerId =
  Entities.sensor.power.washingMachine.power

export const initWashingMachineWatchdog = (
  reminderService: ReminderService,
) => {
  const washingMachinePower = Entity.general(washingMachinePlugPowerId)
  const setWashingMachineNotification = (show: boolean) => {
    if (reminderService.isDisabled) return
    notifications.emit({
      id: 'loadedWashingMachine',
      enabled: show,
    })
  }

  const debouncedWashingMachineState = new DebouncedNumericToggle({
    name: 'washingMachine',
    threshold: 10,
    onDelay: 60000,
    offDelay: 300000,
    onToggleOn: () => setWashingMachineNotification(false),
    onToggleOff: () => setWashingMachineNotification(true),
  })
  reminderService.registerHelper(debouncedWashingMachineState)
  setWashingMachineNotification(false)

  washingMachinePower.onAnyStateUpdate((powerState) => {
    if (washingMachinePower.isUnavailable || reminderService.isDisabled) return
    debouncedWashingMachineState.inputValue(Number(powerState.state))
  })
}
