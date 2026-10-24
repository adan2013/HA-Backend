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
    this.listenOnPrinterPlugState()
    this.listenOnAutoOffToggle()
  }

  private readNumber(value: string | undefined): number | null {
    if (!value?.trim()) return null
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : null
  }

  private getPrintingStatus(): PrinterStatus {
    return this.printerStatus.state?.state as PrinterStatus
  }

  private listenOnNozzleTemp() {
    this.nozzleTemp.onAnyStateUpdate((newTempState) => {
      const nozzleTemp = Number(newTempState.state)
      if (Number.isNaN(nozzleTemp)) return
      if (this.autoOffToggle.isOn) {
        const nozzleIsCold = nozzleTemp <= this.nozzleTempThreshold
        const printIsFinished = this.getPrintingStatus() === 'finish'
        const printerIsOn = this.printerPlug.isOn
        if (nozzleIsCold && printIsFinished && printerIsOn) {
          this.printerPlug.turnOff()
        }
      }
    })
  }

  private listenOnPrinterProgress() {
    ;[
      this.remainingTime,
      this.currentLayer,
      this.totalLayerCount,
      this.progressPercentage,
    ].forEach((entity) => {
      entity.onAnyStateUpdate(() => this.setStatusNotification())
    })
  }

  private listenOnAutoOffToggle() {
    this.autoOffToggle.onAnyStateUpdate(() => {
      this.setStatusNotification()
      this.setOtherNotifications()
    })
  }

  private listenOnPrinterStatus() {
    this.printerStatus.onAnyStateUpdate(() => {
      this.setStatusNotification()
      this.setOtherNotifications()
    })
  }

  private listenOnPrinterPlugState() {
    // Toggle off auto switch after printer is turned off
    // This prevents the kill switch from turning off the printer
    // immediately after it is turned on and status is still set to "finish"
    // (normal behavior of the integration plugin)
    this.printerPlug.onStateValue('off', () => {
      if (this.autoOffToggle.isOn) {
        this.autoOffToggle.turnOff()
      }
      this.setStatusNotification()
    })
    this.printerPlug.onStateValue('on', () => {
      this.setStatusNotification()
    })
  }

  private setStatusNotification() {
    const status = this.getPrintingStatus()
    const printerIsOn = this.printerPlug.isOn
    if (!printerIsOn || status !== 'running') {
      notifications.emit({
        id: '3dPrintStatus',
        enabled: false,
      })
      return
    }

    const progress = this.readNumber(this.progressPercentage.state?.state)
    const currentLayer = this.readNumber(this.currentLayer.state?.state)
    const totalLayerCount = this.readNumber(this.totalLayerCount.state?.state)
    notifications.emit({
      id: '3dPrintStatus',
      enabled: true,
      payload: {
        phase: currentLayer && totalLayerCount ? 'printing' : 'preparing',
        progressPercentage: progress === null ? null : Math.min(100, progress),
        currentLayer,
        totalLayerCount,
        remainingMinutes: this.readNumber(this.remainingTime.state?.state),
        autoOffEnabled: this.autoOffToggle.isOn,
      },
    })
  }

  private setOtherNotifications() {
    const printIsFinished = this.getPrintingStatus() === 'finish'
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
      enabled: printIsFinished,
      ...(printIsFinished
        ? { payload: { autoOffEnabled: this.autoOffToggle.isOn } }
        : {}),
    })
  }
}

export default PrinterController
