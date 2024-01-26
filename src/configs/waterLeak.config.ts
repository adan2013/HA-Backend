type WaterLeakSensor = {
  entityId: string
  name: string
  // TODO array of plugs to turn off (for washing machine)
}

export const waterLeakSensors: WaterLeakSensor[] = [
  {
    entityId: 'binary_sensor.waterfilterleaksensor_water_leak',
    name: 'Water filter',
  },
]
