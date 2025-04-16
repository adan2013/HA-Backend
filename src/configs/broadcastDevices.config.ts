import Entities from './entities.config'

type BroadcastDeviceConfig = {
  name: string
  entityId: string
  type: 'microphone' | 'camera'
}

const broadcastDevices: BroadcastDeviceConfig[] = [
  {
    name: 'Daniels MacBook Pro Microphone',
    entityId: Entities.binarySensor.device.danielMacbookPro.microphone,
    type: 'microphone',
  },
  {
    name: 'Daniels MacBook Pro Camera',
    entityId: Entities.binarySensor.device.danielMacbookPro.camera,
    type: 'camera',
  },
]

export default broadcastDevices
