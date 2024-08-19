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
    runtimeOffDelay: 60,
  },
  {
    currentPowerEntityId: 'sensor.washingmachineplug_power',
    totalEnergyEntityId: 'sensor.washingmachineplug_energy',
    deviceName: 'washingMachine',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 10,
    runtimeOffDelay: 30,
  },
]

export default monitors
