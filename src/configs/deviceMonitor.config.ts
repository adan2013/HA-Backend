import waterLeakConfig from './waterLeak.config'
import Entities from './entities.config'

type DeviceMetadata = {
  entityId: string
  name: string
  maxHoursWithoutUpdate?: number
}

const PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE = 36
const ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE = 3

const devices: DeviceMetadata[] = [
  ...waterLeakConfig.map((wls) => ({
    entityId: wls.entityId,
    name: `${wls.name} - water leak`,
    maxHoursWithoutUpdate: PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE,
  })),
  {
    entityId: Entities.binarySensor.contact.mainDoorDeadbolt,
    name: 'Main door deadbolt',
    maxHoursWithoutUpdate: PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.light.dashNode.tabletLight,
    name: 'Dash node',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.aniaRoom,
    name: 'Ania room temperature',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.danielRoom,
    name: 'Daniel room temperature',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.livingRoom,
    name: 'Living room temperature',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
]

export default devices
