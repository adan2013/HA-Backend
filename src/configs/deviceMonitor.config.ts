type DeviceMetadata = {
  entityId: string
  name: string
}

const devices: DeviceMetadata[] = [
  {
    entityId: 'binary_sensor.waterfilterleaksensor_water_leak',
    name: 'Water filter leak sensor',
  },
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
