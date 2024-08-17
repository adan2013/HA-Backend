import Service from '../Service'
import monitors from '../../configs/energyMonitor.config'
import Entity from '../../entities/Entity'
import { EnergyMonitorServiceData } from './types'
import DebouncedNumericToggle from '../../helpers/DebouncedNumericToggle'
import Timer from '../../Timer'

class EnergyMonitorService extends Service {
  private state: EnergyMonitorServiceData = {
    monitors: [],
  }

  constructor() {
    super('energyMonitor')
    monitors.forEach((config) => {
      const energyEntity = Entity.general(config.totalEnergyEntityId)
      const initialEnergy = Number(energyEntity.state?.state || 0)
      this.state.monitors.push({
        deviceName: config.deviceName,
        consumedEnergy: {
          total: initialEnergy,
          monthly: 0,
          daily: 0,
          runtime: 0,
        },
        initialValues: {
          inThisMonth: initialEnergy,
          inThisDay: initialEnergy,
          inThisRuntime: initialEnergy,
        },
      })
    })
    this.initializeMonitors()
    this.initializeCronJobs()
    this.setServiceData(this.state)
    this.setServiceStatus(`On watchlist: ${monitors.length}`)
  }

  private initializeMonitors() {
    monitors.forEach((config, idx) => {
      const powerEntity = Entity.general(config.currentPowerEntityId)
      const energyEntity = Entity.general(config.totalEnergyEntityId)
      const monitorState = this.state.monitors[idx]

      const debouncedDeviceState = new DebouncedNumericToggle({
        name: config.deviceName,
        threshold: config.runtimePowerThreshold,
        onDelay: config.runtimeOnDelay * 1000,
        offDelay: config.runtimeOffDelay * 1000,
        onToggleOn: () => {
          monitorState.consumedEnergy.runtime = 0
          monitorState.initialValues.inThisRuntime =
            monitorState.consumedEnergy.total
        },
      })
      this.registerHelper(debouncedDeviceState)

      powerEntity.onAnyStateUpdate((powerState) => {
        if (powerEntity.isUnavailable) return
        debouncedDeviceState.inputValue(Number(powerState.state))
      })

      energyEntity.onAnyStateUpdate((energyState) => {
        if (energyEntity.isUnavailable) return
        const consumedTotalEnergy = Number(energyState.state || 0)
        if (consumedTotalEnergy > 0) {
          monitorState.consumedEnergy = {
            total: consumedTotalEnergy,
            monthly:
              consumedTotalEnergy - monitorState.initialValues.inThisMonth,
            daily: consumedTotalEnergy - monitorState.initialValues.inThisDay,
            runtime:
              consumedTotalEnergy - monitorState.initialValues.inThisRuntime,
          }
          this.setServiceData(this.state)
        }
      })
    })
  }

  private initializeCronJobs() {
    Timer.onTime(0, 0, () => this.resetDailyEnergy())
    Timer.onDayOfMonth(1, () => this.resetMonthlyEnergy())
  }

  public resetDailyEnergy() {
    this.state.monitors.forEach((monitor) => {
      monitor.consumedEnergy.daily = 0
      monitor.initialValues.inThisDay = monitor.consumedEnergy.total
    })
    this.setServiceData(this.state)
  }

  public resetMonthlyEnergy() {
    this.state.monitors.forEach((monitor) => {
      monitor.consumedEnergy.monthly = 0
      monitor.initialValues.inThisMonth = monitor.consumedEnergy.total
    })
    this.setServiceData(this.state)
  }
}

export default EnergyMonitorService
