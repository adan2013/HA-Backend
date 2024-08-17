type EnergyMonitorConfig = {
  currentPowerEntityId: string
  totalEnergyEntityId: string
  deviceName: string
  runtimeEnergyThreshold: number
  runtimeOnDelay: number
  runtimeOffDelay: number
}

const monitors: EnergyMonitorConfig[] = [
  {
    currentPowerEntityId: 'sensor.airconditionerbreaker_power',
    totalEnergyEntityId: 'sensor.airconditionerbreaker_energy',
    deviceName: 'Gree A/C',
    runtimeEnergyThreshold: 10,
    runtimeOnDelay: 60,
    runtimeOffDelay: 60,
  },
  {
    currentPowerEntityId: 'sensor.washingmachineplug_power',
    totalEnergyEntityId: 'sensor.washingmachineplug_energy',
    deviceName: 'Washing Machine',
    runtimeEnergyThreshold: 10,
    runtimeOnDelay: 60,
    runtimeOffDelay: 30,
  },
]

export default monitors
