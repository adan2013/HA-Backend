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
    currentPowerEntityId: 'sensor.airconditionerbreaker_power',
    totalEnergyEntityId: 'sensor.airconditionerbreaker_energy',
    deviceName: 'greeAirConditioner',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 300,
  },
  {
    currentPowerEntityId: 'sensor.washingmachineplug_power',
    totalEnergyEntityId: 'sensor.washingmachineplug_energy',
    deviceName: 'washingMachine',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 180,
  },
  {
    currentPowerEntityId: 'sensor.bambulabprinterplug_power',
    totalEnergyEntityId: 'sensor.bambulabprinterplug_energy',
    deviceName: 'bambuLabPrinter',
    runtimePowerThreshold: 50,
    runtimeOnDelay: 20,
    runtimeOffDelay: 300,
  },
]

export default monitors
