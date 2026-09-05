import waterLeakConfig from './waterLeak.config'
import Entities from './entities.config'

type DeviceMetadata = {
  entityId: string
  name: string
  maxHoursWithoutUpdate?: number
}

const devices: DeviceMetadata[] = [
  ...waterLeakConfig.map((wls) => ({
    entityId: wls.entityId,
    name: `${wls.name} - water leak`,
  })),
  {
    entityId: Entities.binarySensor.contact.mainDoorDeadbolt,
    name: 'Main door deadbolt',
  },
  {
    entityId: Entities.light.dashNode.tabletLight,
    name: 'Dash node',
  },
  {
    entityId: Entities.sensor.temperature.aniaRoom,
    name: 'Ania room temperature',
    maxHoursWithoutUpdate: 3,
  },
  {
    entityId: Entities.sensor.temperature.danielRoom,
    name: 'Daniel room temperature',
    maxHoursWithoutUpdate: 3,
  },
  {
    entityId: Entities.sensor.temperature.livingRoom,
    name: 'Living room temperature',
    maxHoursWithoutUpdate: 3,
  },
]

export default devices
