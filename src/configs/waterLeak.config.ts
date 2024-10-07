import Entities from './entities.config'

type WaterLeakSensor = {
  entityId: string
  name: string
  // TODO array of plugs to turn off (for washing machine)
}

const waterLeakSensors: WaterLeakSensor[] = [
  {
    entityId: Entities.binarySensor.waterFilterLeakSensor,
    name: 'Water filter',
  },
  {
    entityId: Entities.binarySensor.washingMachineLeakSensor,
    name: 'Washing machine',
  },
]

export default waterLeakSensors
