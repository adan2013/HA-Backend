import waterLeakConfig from './waterLeak.config'
import Entities from './entities.config'

type DeviceMetadata = {
  entityId: string
  name: string
}

const devices: DeviceMetadata[] = [
  ...waterLeakConfig.map((wls) => ({
    entityId: wls.entityId,
    name: `${wls.name} - water leak`,
  })),
  {
    entityId: Entities.binarySensor.mainDoorDeadboltSensor,
    name: 'Main door deadbolt',
  },
  {
    entityId: Entities.light.dashNodeTabletNotificationLights,
    name: 'Dash node',
  },
]

export default devices
