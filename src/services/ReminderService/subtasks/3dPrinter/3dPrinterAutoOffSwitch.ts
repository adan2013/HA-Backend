import Entity from '../../../../entities/Entity'
import ReminderService from '../../ReminderService'

export const automationToggleId = 'input_boolean.printerautooff'
export const printerPlugId = 'switch.bambulabprinterplug'
export const printerStatusId = 'sensor.p1s_01p00a453001011_print_status'
export const nozzleTempId = 'sensor.p1s_01p00a453001011_nozzle_temperature'

export const nozzleTempThreshold = 42

export const init3dPrinterAutoOffSwitch = (
  reminderService: ReminderService,
) => {
  const automationToggleEntity = Entity.toggle(automationToggleId)
  const plugEntity = Entity.switch(printerPlugId)
  const statusEntity = Entity.general(printerStatusId)
  const nozzleTempEntity = Entity.general(nozzleTempId)

  nozzleTempEntity.onAnyStateUpdate((newTempState) => {
    if (reminderService.isDisabled) return
    const nozzleTemp = Number(newTempState.state)
    if (Number.isNaN(nozzleTemp)) return
    if (automationToggleEntity.isOn) {
      const nozzleIsCold = nozzleTemp < nozzleTempThreshold
      const printIsFinished = statusEntity.state?.state === 'finish'
      const printerIsOn = plugEntity.isOn
      if (nozzleIsCold && printIsFinished && printerIsOn) {
        plugEntity.turnOff()
        automationToggleEntity.turnOff()
      }
    }
  })
}
