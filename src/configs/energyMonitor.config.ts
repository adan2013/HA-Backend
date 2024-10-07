import Entities from './entities.config'

type EnergyMonitorConfig = {
  currentPowerEntityId: string
  totalEnergyEntityId: string
  deviceName: string
  runtimePowerThreshold: number
  runtimeOnDelay: number
  runtimeOffDelay: number
}

const monitors: EnergyMonitorConfig[] = [
  {
    currentPowerEntityId: Entities.sensor.airConditionerBreaker.power,
    totalEnergyEntityId: Entities.sensor.airConditionerBreaker.energy,
    deviceName: 'greeAirConditioner',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 300,
  },
  {
    currentPowerEntityId: Entities.sensor.washingMachinePlug.power,
    totalEnergyEntityId: Entities.sensor.washingMachinePlug.energy,
    deviceName: 'washingMachine',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 180,
  },
  {
    currentPowerEntityId: Entities.sensor.bambuLabPrinterPlug.power,
    totalEnergyEntityId: Entities.sensor.bambuLabPrinterPlug.energy,
    deviceName: 'bambuLabPrinter',
    runtimePowerThreshold: 50,
    runtimeOnDelay: 20,
    runtimeOffDelay: 300,
  },
]

export default monitors
