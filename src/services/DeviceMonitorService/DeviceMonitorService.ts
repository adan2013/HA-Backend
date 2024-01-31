import Service from '../Service'
import { anyEntityUpdate, notifications } from '../../events/events'
import Entity from '../../entities/Entity'
import { EntityState } from '../../connectors/types'
import devices from '../../configs/deviceMonitor.config'

type DetectedDeviceMetadata = {
  entityId: string
  name: string
  lowBattery: boolean
  lowSignal: boolean
  offline: boolean
  monitored: boolean
}

class DeviceMonitorService extends Service {
  private readonly BATTERY_LOW_THRESHOLD = 30
  private readonly SIGNAL_LOW_THRESHOLD = 20
  detectedDevices: DetectedDeviceMetadata[] = []

  constructor() {
    super('deviceMonitor')
    this.updateServiceStatus()
    anyEntityUpdate.on((state) => {
      if (this.isDisabled) return
      const metadata = this.checkDevice(state)
      const reportThisDevice =
        metadata.lowBattery ||
        ((metadata.lowSignal || metadata.offline) && metadata.monitored)
      this.updateList(metadata, reportThisDevice)
    })
  }

  private updateList(metadata: DetectedDeviceMetadata, addToList: boolean) {
    const isOnList = this.detectedDevices.some(
      (d) => d.entityId === metadata.entityId,
    )
    if (isOnList) {
      this.detectedDevices = this.detectedDevices.filter(
        (d) => d.entityId !== metadata.entityId,
      )
    }
    if (addToList) {
      this.detectedDevices.push(metadata)
    }
    if (isOnList || addToList) {
      this.updateServiceStatus()
    }
  }

  private updateServiceStatus() {
    const bat = this.detectedDevices.filter((dd) => dd.lowBattery)
    const sig = this.detectedDevices.filter((dd) => dd.lowSignal)
    const off = this.detectedDevices.filter((dd) => dd.offline)
    const sigAndOff = this.detectedDevices.filter(
      (dd) => dd.lowSignal || dd.offline,
    )
    this.setServiceStatus(
      `Low batteries: ${bat.length}; Low signal: ${sig.length}; Offline: ${off.length}; On watchlist: ${devices.length}`,
      this.detectedDevices.length > 0 ? 'yellow' : 'green',
    )
    notifications.emit({
      id: 'lowBattery',
      enabled: bat.length > 0,
      extraInfo: bat.map((d) => d.name).join(', '),
    })
    notifications.emit({
      id: 'offlineSensor',
      enabled: sigAndOff.length > 0,
      extraInfo: sigAndOff.map((d) => d.name).join(', '),
    })
  }

  private checkDevice(state: EntityState): DetectedDeviceMetadata {
    const config = devices.find((d) => d.entityId === state.id)
    const entity = Entity.general(state.id, {
      initialState: state,
      subscribeToUpdates: false,
    })
    const result: DetectedDeviceMetadata = {
      entityId: entity.entityId,
      name: config?.name || entity.entityId,
      lowBattery: false,
      lowSignal: false,
      offline: false,
      monitored: !!config,
    }
    if (entity.isUnavailable) {
      result.offline = true
    } else {
      result.lowBattery =
        entity.isBatteryPowered &&
        entity.batteryLevel < this.BATTERY_LOW_THRESHOLD
      result.lowSignal =
        entity.isWireless && entity.linkQuality < this.SIGNAL_LOW_THRESHOLD
    }
    return result
  }
}

export default DeviceMonitorService
