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
    currentPowerEntityId: Entities.sensor.power.balcony.power,
    totalEnergyEntityId: Entities.sensor.power.balcony.energy,
    deviceName: 'balconyCircuit',
    runtimePowerThreshold: 100,
    runtimeOnDelay: 10,
    runtimeOffDelay: 300,
  },
  {
    currentPowerEntityId: Entities.sensor.power.washingMachine.power,
    totalEnergyEntityId: Entities.sensor.power.washingMachine.energy,
    deviceName: 'washingMachine',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 180,
  },
  {
    currentPowerEntityId: Entities.sensor.power.bambuLabPrinter.power,
    totalEnergyEntityId: Entities.sensor.power.bambuLabPrinter.energy,
    deviceName: 'bambuLabPrinter',
    runtimePowerThreshold: 50,
    runtimeOnDelay: 20,
    runtimeOffDelay: 300,
  },
]

export default monitors
