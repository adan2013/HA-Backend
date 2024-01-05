import Service from '../Service'
import Entity from '../../entities/Entity'
import DebouncedNumericToggle from '../../helpers/DebouncedNumericToggle'
import { notifications } from '../../events/events'
import { getDaysToNextInspection, inspections } from './waterFilterConfig'
import Timer from '../../Timer'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'

class ReminderService extends Service {
  private readonly WATER_FILTER_INSPECTION_THRESHOLD = 10

  constructor() {
    super('reminder')
    this.initializeWashingMachineWatchdog()
    this.initializeWaterFilterWatchdog()
  }

  private initializeWashingMachineWatchdog() {
    const washingMachinePower = Entity.general(
      'sensor.washingmachineplug_power',
    )
    const washingMachineState = Entity.select(
      'input_select.washingmachinestate',
    )
    const setWashingMachineState = (isWorking: boolean) => {
      if (this.isDisabled) return
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
    this.registerHelper(debouncedWashingMachineState)
    washingMachineState.setOption('EMPTY')
    washingMachinePower.onAnyStateUpdate((powerState) => {
      if (washingMachinePower.isUnavailable) return
      debouncedWashingMachineState.inputValue(Number(powerState.state))
    })
    washingMachineState.onAnyStateUpdate((wmState) => {
      if (this.isDisabled) return
      notifications.emit({
        id: 'loadedWashingMachine',
        enabled: wmState.state === 'LOADED',
      })
    })
  }

  private initializeWaterFilterWatchdog() {
    const entites: HomeAssistantEntity[] = inspections.map((ins) =>
      Entity.general(ins.entityId),
    )
    const checkInspections = () => {
      const detectedInspections: string[] = []
      inspections.forEach((ins) => {
        const entity = entites.find((e) => e.entityId === ins.entityId)
        if (entity && !entity.isUnavailable) {
          const daysLeft = getDaysToNextInspection(
            entity.state?.state,
            ins.interval,
          )
          if (daysLeft <= this.WATER_FILTER_INSPECTION_THRESHOLD) {
            detectedInspections.push(ins.label)
          }
        }
      })
      const inspectionRequired = detectedInspections.length > 0
      notifications.emit({
        id: 'waterFilterInspection',
        enabled: inspectionRequired,
        extraInfo: inspectionRequired
          ? detectedInspections.join(', ')
          : undefined,
      })
    }
    entites.forEach((e) => e.onAnyStateUpdate(() => checkInspections()))
    Timer.onTime(7, 0, () => checkInspections())
    checkInspections()
  }
}

export default ReminderService
