import Entities from '../../configs/entities.config'
import Entity from '../../entities/Entity'
import { notifications } from '../../events/events'
import Service from '../Service'

export const autoOffToggleId = Entities.inputBoolean.automations.printerAutoOff
export const printerPlugId = Entities.switch.plug.bambuLabPrinter
export const printerStatusId = Entities.sensor.bambuLabPrinter.printStatus
export const printerNozzleTempId =
  Entities.sensor.bambuLabPrinter.nozzleTemperature
export const printerProgressPercentageId =
  Entities.sensor.bambuLabPrinter.progressPercentage
export const printerRemainingTimeId =
  Entities.sensor.bambuLabPrinter.remainingTime
export const printerCurrentLayerId =
  Entities.sensor.bambuLabPrinter.currentLayer
export const printerTotalLayerCountId =
  Entities.sensor.bambuLabPrinter.totalLayerCount

export type PrinterStatus =
  | 'failed'
  | 'finish'
  | 'idle'
  | 'init'
  | 'offline'
  | 'pause'
  | 'prepare'
  | 'running'
  | 'slicing'
  | 'unknown'
  | 'offline'

class PrinterController extends Service {
  private readonly nozzleTempThreshold = 45
  private autoOffToggle = Entity.toggle(autoOffToggleId)
  private printerPlug = Entity.switch(printerPlugId)
  private printerStatus = Entity.general(printerStatusId)
  private nozzleTemp = Entity.general(printerNozzleTempId)
  private progressPercentage = Entity.general(printerProgressPercentageId)
  private remainingTime = Entity.general(printerRemainingTimeId)
  private currentLayer = Entity.general(printerCurrentLayerId)
  private totalLayerCount = Entity.general(printerTotalLayerCountId)

  constructor() {
    super('printerController')
    this.listenOnNozzleTemp()
    this.listenOnPrinterProgress()
    this.listenOnPrinterStatus()
  }

  private formatRemainingTime(timeInMinutes: string | undefined) {
    if (!timeInMinutes || Number(timeInMinutes) === 0) return undefined
    const hours = Math.floor(Number(timeInMinutes) / 60)
    const minutes = Math.floor(Number(timeInMinutes) % 60)
    return `${hours}h ${minutes}m remaining`
  }

  private getPrintingStatus(): PrinterStatus {
    return this.printerStatus.state?.state as PrinterStatus
  }

  private listenOnNozzleTemp() {
    this.nozzleTemp.onAnyStateUpdate((newTempState) => {
      if (this.isDisabled) return
      const nozzleTemp = Number(newTempState.state)
      if (Number.isNaN(nozzleTemp)) return
      if (this.autoOffToggle.isOn) {
        const nozzleIsCold = nozzleTemp <= this.nozzleTempThreshold
        const printIsFinished = this.getPrintingStatus() === 'finish'
        const printerIsOn = this.printerPlug.isOn
        if (nozzleIsCold && printIsFinished && printerIsOn) {
          this.printerPlug.turnOff()
          this.autoOffToggle.turnOff()
        }
      }
    })
  }

  private listenOnPrinterProgress() {
    this.printerStatus.onAnyStateUpdate(() => {
      this.setStatusNotification()
    })
    this.currentLayer.onAnyStateUpdate(() => {
      this.setStatusNotification()
    })
  }

  private listenOnPrinterStatus() {
    this.printerStatus.onAnyStateUpdate(() => {
      this.setOtherNotifications()
    })
  }

  private setStatusNotification() {
    if (this.isDisabled) return

    if (this.getPrintingStatus() !== 'running') {
      notifications.emit({
        id: '3dPrintStatus',
        enabled: false,
      })
      return
    }

    const percentage = this.progressPercentage.state
      ? `${this.progressPercentage.state.state}%`
      : '0%'
    const currentLayer = this.currentLayer.state
      ? `${this.currentLayer.state.state}`
      : '0'
    const totalLayerCount = this.totalLayerCount.state
      ? `${this.totalLayerCount.state.state}`
      : '0'
    const remainingTime = this.formatRemainingTime(
      this.remainingTime.state?.state,
    )

    if (currentLayer === '0' || totalLayerCount === '0') {
      notifications.emit({
        id: '3dPrintStatus',
        enabled: true,
        extraInfo: `Preparing to print...`,
      })
    } else {
      notifications.emit({
        id: '3dPrintStatus',
        enabled: true,
        extraInfo: `[${percentage}] ${currentLayer} / ${totalLayerCount}${
          remainingTime ? `, ${remainingTime}` : ''
        }`,
      })
    }
  }

  private setOtherNotifications() {
    notifications.emit({
      id: '3dPrintPaused',
      enabled: this.getPrintingStatus() === 'pause',
    })
    notifications.emit({
      id: '3dPrintFailed',
      enabled: this.getPrintingStatus() === 'failed',
    })
    notifications.emit({
      id: '3dPrintFinished',
      enabled: this.getPrintingStatus() === 'finish',
    })
  }
}

export default PrinterController
