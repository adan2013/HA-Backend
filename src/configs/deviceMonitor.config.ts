import waterLeakSensors from './waterLeak.config'

type DeviceMetadata = {
  entityId: string
  name: string
}

const devices: DeviceMetadata[] = [
  ...waterLeakSensors.map((wls) => ({
    entityId: wls.entityId,
    name: `${wls.name} - water leak sensor`,
  })),
  {
    entityId: 'binary_sensor.maindoordeadboltsensor_contact',
    name: 'Main door deadbolt',
  },
]

export default devices
