import Entity from '../../../../entities/Entity'
import ReminderService from '../../ReminderService'
import Entities from '../../../../configs/entities.config'

export const automationToggleId = Entities.inputBoolean.printerAutoOff
export const printerPlugId = Entities.switch.plug.bambuLabPrinter
export const printerStatusId = Entities.sensor.bambuLabPrinter.printStatus
export const nozzleTempId = Entities.sensor.bambuLabPrinter.nozzleTemperature

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
