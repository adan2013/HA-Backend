import waterLeakConfig from './waterLeak.config'
import Entities from './entities.config'

export type PingDeviceMetadata = {
  monitoring: 'ping'
  ipAddress: string
  intervalHours: number
  entityId: string
  name: string
}

type EntityDeviceMetadata = {
  monitoring: 'entity'
  entityId: string
  name: string
  maxHoursWithoutUpdate?: number
}

type DeviceMetadata = EntityDeviceMetadata | PingDeviceMetadata

const PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE = 36
const ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE = 3

const devices: DeviceMetadata[] = [
  ...waterLeakConfig.map((wls) => ({
    monitoring: 'entity' as const,
    entityId: wls.entityId,
    name: `${wls.name} - water leak`,
    maxHoursWithoutUpdate: PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE,
  })),
  {
    entityId: Entities.binarySensor.contact.mainDoorDeadbolt,
    name: 'Main door deadbolt',
    monitoring: 'entity',
    maxHoursWithoutUpdate: PASSIVE_SENSOR_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.dashNodeServerRack,
    name: 'Dash node',
    monitoring: 'ping',
    ipAddress: '192.168.1.5',
    intervalHours: 2,
  },
  {
    entityId: Entities.sensor.temperature.aniaRoom,
    name: 'Ania room temperature',
    monitoring: 'entity',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.danielRoom,
    name: 'Daniel room temperature',
    monitoring: 'entity',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
  {
    entityId: Entities.sensor.temperature.livingRoom,
    name: 'Living room temperature',
    monitoring: 'entity',
    maxHoursWithoutUpdate: ACTIVE_DEVICE_MAX_HOURS_WITHOUT_UPDATE,
  },
]

export default devices
