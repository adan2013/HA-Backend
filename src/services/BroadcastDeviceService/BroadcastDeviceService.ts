import broadcastDevices from '../../configs/broadcastDevices.config'
import Entity from '../../entities/Entity'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'
import { notifications } from '../../events/events'
import Service from '../Service'

class BroadcastDeviceService extends Service {
  private deviceEntities: HomeAssistantEntity[]

  constructor() {
    super('broadcastDevice')
    this.deviceEntities = broadcastDevices.map((d) =>
      Entity.general(d.entityId),
    )
    this.deviceEntities.forEach((d) =>
      d.onAnyStateUpdate(() => this.checkBroadcastDevices()),
    )
    this.checkBroadcastDevices()
  }

  private checkBroadcastDevices() {
    if (this.isDisabled) return
    const detectedCameras: string[] = []
    const detectedMicrophones: string[] = []
    broadcastDevices.forEach((sensor) => {
      const entity = this.deviceEntities.find(
        (e) => e.entityId === sensor.entityId,
      )
      if (entity?.isOn) {
        switch (sensor.type) {
          case 'camera':
            detectedCameras.push(sensor.name)
            break
          case 'microphone':
            detectedMicrophones.push(sensor.name)
            break
        }
      }
    })

    if (detectedCameras.length > 0) {
      notifications.emit({
        id: 'broadcastDeviceCamera',
        enabled: true,
        extraInfo: detectedCameras.join(', '),
      })
      notifications.emit({
        id: 'broadcastDeviceMicrophone',
        enabled: false,
      })
    } else if (detectedMicrophones.length > 0) {
      notifications.emit({
        id: 'broadcastDeviceMicrophone',
        enabled: true,
        extraInfo: detectedMicrophones.join(', '),
      })
      notifications.emit({
        id: 'broadcastDeviceCamera',
        enabled: false,
      })
    } else {
      notifications.emit({
        id: 'broadcastDeviceMicrophone',
        enabled: false,
      })
      notifications.emit({
        id: 'broadcastDeviceCamera',
        enabled: false,
      })
    }
    this.setServiceStatus(
      `Camera count: ${detectedCameras.length}; Microphone count: ${detectedMicrophones.length}`,
      detectedCameras.length + detectedMicrophones.length > 0
        ? 'yellow'
        : 'green',
    )
  }
}

export default BroadcastDeviceService
