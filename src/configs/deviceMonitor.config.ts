import waterLeakConfig from './waterLeak.config'

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
    entityId: 'binary_sensor.maindoordeadboltsensor_contact',
    name: 'Main door deadbolt',
  },
  {
    entityId: 'light.dash_node_tablet_notification_lights',
    name: 'Dash node',
  },
]

export default devices
