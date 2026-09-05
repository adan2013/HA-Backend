import Service from '../Service'
import { anyEntityUpdate, notifications } from '../../events/events'
import Entity from '../../entities/Entity'
import { EntityState } from '../../connectors/types'
import devices from '../../configs/deviceMonitor.config'
import Entities from '../../configs/entities.config'
import Timer from '../../Timer'

type DetectedDeviceMetadata = {
  entityId: string
  name: string
  lowBattery: boolean
  lowSignal: boolean
  offline: boolean
  noUpdate: boolean
  monitored: boolean
}

class DeviceMonitorService extends Service {
  private readonly BATTERY_LOW_THRESHOLD = 40
  private readonly SIGNAL_LOW_THRESHOLD = 60
  private readonly latestStates = new Map<string, EntityState>()
  detectedDevices: DetectedDeviceMetadata[] = []
  private batteryLevelAlertToggle = Entity.toggle(
    Entities.inputBoolean.system.alertBatteryLevel,
  )
  private selfDiagnosticAlertToggle = Entity.toggle(
    Entities.inputBoolean.system.alertSelfDiagnostic,
  )

  constructor() {
    super('deviceMonitor')
    this.initializeUpdateMonitoring()
    this.updateServiceStatus()
    anyEntityUpdate.on((state) => {
      if (
        this.getDeviceConfig(state.id)?.maxHoursWithoutUpdate !== undefined
      ) {
        this.latestStates.set(state.id, this.withValidLastUpdated(state))
      }
      const metadata = this.checkDevice(state)
      this.updateList(metadata, this.shouldReport(metadata))
    })
    this.batteryLevelAlertToggle.onChange(() => this.updateServiceStatus())
    this.selfDiagnosticAlertToggle.onChange(() => this.updateServiceStatus())
    Timer.onEveryMinute(() => this.checkForMissingUpdates())
  }

  private updateList(metadata: DetectedDeviceMetadata, addToList: boolean) {
    const currentIndex = this.detectedDevices.findIndex(
      (device) => device.entityId === metadata.entityId,
    )
    const isOnList = currentIndex >= 0
    if (addToList) {
      if (
        isOnList &&
        JSON.stringify(this.detectedDevices[currentIndex]) ===
          JSON.stringify(metadata)
      ) {
        return
      }
      if (isOnList) {
        this.detectedDevices[currentIndex] = metadata
      } else {
        this.detectedDevices.push(metadata)
      }
    } else if (isOnList) {
      this.detectedDevices.splice(currentIndex, 1)
    }
    if (isOnList || addToList) {
      this.updateServiceStatus()
    }
  }

  private updateServiceStatus() {
    const bat = this.detectedDevices.filter((dd) => dd.lowBattery)
    const lqi = this.detectedDevices.filter((dd) => dd.lowSignal)
    const off = this.detectedDevices.filter((dd) => dd.offline)
    const noUpdate = this.detectedDevices.filter((dd) => dd.noUpdate)
    this.setServiceStatus(
      `Low batteries: ${bat.length}; Low signal: ${lqi.length}; Offline: ${off.length}; No update: ${noUpdate.length}; On watchlist: ${devices.length}`,
      this.detectedDevices.length > 0 ? 'yellow' : 'green',
    )
    const switchNotification = (
      id: string,
      list: DetectedDeviceMetadata[],
      alertsEnabled = true,
    ) => {
      const isOn = alertsEnabled && list.length > 0
      notifications.emit({
        id: id,
        enabled: isOn,
        extraInfo: isOn ? list.map((d) => d.name).join(', ') : undefined,
      })
    }
    switchNotification('lowBattery', bat, this.batteryLevelAlertToggle.isOn)
    switchNotification('weakSignal', lqi, this.selfDiagnosticAlertToggle.isOn)
    switchNotification(
      'offlineSensor',
      off,
      this.selfDiagnosticAlertToggle.isOn,
    )
    switchNotification(
      'noSensorUpdate',
      noUpdate,
      this.selfDiagnosticAlertToggle.isOn,
    )
  }

  private getDeviceConfig(entityId: string) {
    return devices.find((device) => device.entityId === entityId)
  }

  private shouldReport(metadata: DetectedDeviceMetadata) {
    return (
      metadata.lowBattery ||
      ((metadata.lowSignal || metadata.offline || metadata.noUpdate) &&
        metadata.monitored)
    )
  }

  private withValidLastUpdated(state: EntityState): EntityState {
    return Number.isNaN(Date.parse(state.lastUpdated))
      ? { ...state, lastUpdated: new Date().toISOString() }
      : state
  }

  private initializeUpdateMonitoring() {
    devices
      .filter((config) => config.maxHoursWithoutUpdate !== undefined)
      .forEach((config) => {
        const state = Entity.general(config.entityId, {
          subscribeToUpdates: false,
        }).state
        if (!state) return
        this.latestStates.set(config.entityId, state)
        const metadata = this.checkDevice(state)
        if (this.shouldReport(metadata)) {
          this.detectedDevices.push(metadata)
        }
      })
  }

  private checkForMissingUpdates() {
    devices
      .filter((config) => config.maxHoursWithoutUpdate !== undefined)
      .forEach((config) => {
        const state = this.latestStates.get(config.entityId)
        if (!state) return
        const metadata = this.checkDevice(state)
        this.updateList(metadata, this.shouldReport(metadata))
      })
  }

  private checkDevice(state: EntityState): DetectedDeviceMetadata {
    const config = this.getDeviceConfig(state.id)
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
      noUpdate: false,
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
      if (config?.maxHoursWithoutUpdate !== undefined) {
        const lastUpdateTimestamp = Date.parse(state.lastUpdated)
        result.noUpdate =
          !Number.isNaN(lastUpdateTimestamp) &&
          Date.now() - lastUpdateTimestamp >=
            config.maxHoursWithoutUpdate * 60 * 60 * 1000
      }
    }
    return result
  }
}

export default DeviceMonitorService
