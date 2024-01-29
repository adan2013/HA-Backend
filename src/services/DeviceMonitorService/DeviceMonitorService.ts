import Service from '../Service'
import { anyEntityUpdate, notifications } from '../../events/events'
import Entity from '../../entities/Entity'
import { EntityState } from '../../connectors/types'
import devices from '../../configs/deviceMonitor.config'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'

type DetectedDeviceMetadata = {
  entityId: string
  name: string
  batteryLevel?: number
  linkQuality?: number
}

class DeviceMonitorService extends Service {
  private readonly BATTERY_LOW_THRESHOLD = 30
  private readonly SIGNAL_LOW_THRESHOLD = 30
  detectedLowBatteryDevices: DetectedDeviceMetadata[] = []
  detectedOfflineDevices: DetectedDeviceMetadata[] = []

  constructor() {
    super('deviceMonitor')
    this.updateServiceStatus()
    anyEntityUpdate.on((state) => {
      if (this.isDisabled) return
      this.checkBattery(state)
      this.checkSignal(state)
    })
  }

  private updateServiceStatus() {
    const bat = this.detectedLowBatteryDevices
    const sig = this.detectedOfflineDevices
    this.setServiceStatus(
      `Low batteries: ${bat.length}; Offline: ${sig.length}; On watchlist: ${devices.length}`,
      bat.length > 0 || sig.length > 0 ? 'yellow' : 'green',
    )
    notifications.emit({
      id: 'lowBattery',
      enabled: bat.length > 0,
      extraInfo: bat.map((d) => d.name).join(', '),
    })
    notifications.emit({
      id: 'offlineSensor',
      enabled: sig.length > 0,
      extraInfo: sig.map((d) => d.name).join(', '),
    })
  }

  private updateList(
    list: DetectedDeviceMetadata[],
    entity: HomeAssistantEntity,
    shouldBeOnList: boolean,
    name?: string,
  ) {
    const isOnList = list.some((d) => d.entityId === entity.entityId)
    if (isOnList) {
      list = list.filter((d) => d.entityId !== entity.entityId)
    }
    if (shouldBeOnList) {
      list.push({
        entityId: entity.entityId,
        name: name || entity.entityId,
        batteryLevel: entity.batteryLevel,
        linkQuality: entity.linkQuality,
      })
      this.updateServiceStatus()
    } else if (isOnList) {
      this.updateServiceStatus()
    }
  }

  private checkBattery(updatedState: EntityState) {
    const entity = Entity.general(updatedState.id, {
      initialState: updatedState,
      subscribeToUpdates: false,
    })
    if (entity.isUnavailable || !entity.isBatteryPowered) return
    const batteryLow = entity.batteryLevel < this.BATTERY_LOW_THRESHOLD
    this.updateList(this.detectedLowBatteryDevices, entity, batteryLow)
  }

  private checkSignal(updatedState: EntityState) {
    const deviceMetadata = devices.find((d) => d.entityId === updatedState.id)
    if (!deviceMetadata) return
    const entity = Entity.general(updatedState.id, {
      initialState: updatedState,
      subscribeToUpdates: false,
    })
    const problemDetected =
      entity.isUnavailable ||
      (entity.isWireless && entity.linkQuality < this.SIGNAL_LOW_THRESHOLD)
    this.updateList(
      this.detectedOfflineDevices,
      entity,
      problemDetected,
      deviceMetadata.name,
    )
  }
}

export default DeviceMonitorService
