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
    deviceName: 'Gree A/C',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 60,
    runtimeOffDelay: 60,
  },
  {
    currentPowerEntityId: 'sensor.washingmachineplug_power',
    totalEnergyEntityId: 'sensor.washingmachineplug_energy',
    deviceName: 'Washing Machine',
    runtimePowerThreshold: 10,
    runtimeOnDelay: 60,
    runtimeOffDelay: 30,
  },
]

export default monitors
