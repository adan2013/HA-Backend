import ReminderService from '../../ReminderService'
import Entity from '../../../../entities/Entity'
import DebouncedNumericToggle from '../../../../helpers/DebouncedNumericToggle'
import { notifications } from '../../../../events/events'

export const printerPowerId = 'sensor.bambulabprinterplug_power'

export const init3dPrinterWatchdog = (reminderService: ReminderService) => {
  const printerPower = Entity.general(printerPowerId)
  const setPrinterNotification = (show: boolean) => {
    if (reminderService.isDisabled) return
    notifications.emit({
      id: '3dPrintFinished',
      enabled: show,
    })
  }

  const debounced3dPrinterState = new DebouncedNumericToggle({
    name: '3dPrinter',
    threshold: 20,
    onDelay: 120000,
    offDelay: 120000,
    onToggleOn: () => setPrinterNotification(false),
    onToggleOff: () => setPrinterNotification(true),
  })
  reminderService.registerHelper(debounced3dPrinterState)
  setPrinterNotification(false)

  printerPower.onAnyStateUpdate((powerState) => {
    if (printerPower.isUnavailable || reminderService.isDisabled) return
    debounced3dPrinterState.inputValue(Number(powerState.state))
  })
}
