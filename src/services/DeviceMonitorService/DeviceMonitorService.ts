import Service from '../Service'
import {
  anyEntityUpdate,
  entityReported,
  notifications,
} from '../../events/events'
import Entity from '../../entities/Entity'
import { EntityState } from '../../connectors/types'
import devices, { PingDeviceMetadata } from '../../configs/deviceMonitor.config'
import Entities from '../../configs/entities.config'
import Timer from '../../Timer'
import { parseBatteryReading } from '../../utils/batteryUtils'
import { pingHost } from '../../utils/pingHost'
import { createLogger } from '../../logging/logger'
import {
  NotificationDetails,
  OfflineReason,
} from '../NotificationsService/notificationContract'

const logger = createLogger('DeviceMonitorService')

type DetectedDeviceMetadata = {
  entityId: string
  name: string
  lowBattery: boolean
  offline: boolean
  noUpdate: boolean
  monitored: boolean
  batteryPercentage?: number
  hoursSinceLastReport?: number
  offlineReason?: OfflineReason
}

class DeviceMonitorService extends Service {
  private readonly BATTERY_LOW_THRESHOLD = 40
  private readonly latestStates = new Map<string, EntityState>()
  private readonly pendingPings = new Set<string>()
  detectedDevices: DetectedDeviceMetadata[] = []
  private batteryLevelAlertToggle = Entity.toggle(
    Entities.inputBoolean.system.alertBatteryLevel,
  )
  private selfDiagnosticAlertToggle = Entity.toggle(
    Entities.inputBoolean.system.alertSelfDiagnostic,
  )

  constructor() {
    super('deviceMonitor')
    this.updateServiceStatus()
    const registerEntityActivity = (state: EntityState) => {
      const config = this.getDeviceConfig(state.id)
      // LAN availability is independent of Home Assistant entity activity.
      if (config?.monitoring === 'ping') return
      if (config?.maxHoursWithoutUpdate !== undefined) {
        this.latestStates.set(state.id, this.withValidLastReported(state))
      }
      const metadata = this.checkDevice(state)
      this.updateList(metadata, this.shouldReport(metadata))
    }
    anyEntityUpdate.on(registerEntityActivity)
    entityReported.on(registerEntityActivity)
    this.batteryLevelAlertToggle.onChange(() => this.updateServiceStatus())
    this.selfDiagnosticAlertToggle.onChange(() => this.updateServiceStatus())
    Timer.onEveryHour(() => this.checkForMissingUpdates())
    devices.forEach((config) => {
      if (config.monitoring !== 'ping') return
      void this.checkPingDevice(config)
      setInterval(
        () => void this.checkPingDevice(config),
        config.intervalHours * 60 * 60 * 1000,
      )
    })
  }

  private async checkPingDevice(config: PingDeviceMetadata) {
    if (this.pendingPings.has(config.entityId)) return
    this.pendingPings.add(config.entityId)
    try {
      const reachable = await pingHost(config.ipAddress)
      const metadata: DetectedDeviceMetadata = {
        entityId: config.entityId,
        name: config.name,
        lowBattery: false,
        offline: !reachable,
        offlineReason: reachable ? undefined : 'pingFailed',
        noUpdate: false,
        monitored: true,
      }
      this.updateList(metadata, this.shouldReport(metadata))
    } catch (error) {
      // A local probe error is not evidence that the device is offline.
      logger.error('Device ping failed', {
        entityId: config.entityId,
        ipAddress: config.ipAddress,
        error,
      })
    } finally {
      this.pendingPings.delete(config.entityId)
    }
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
    const off = this.detectedDevices.filter((dd) => dd.offline)
    const noUpdate = this.detectedDevices.filter((dd) => dd.noUpdate)
    this.setServiceStatus(
      `Low batteries: ${bat.length}; Offline: ${off.length}; No update: ${noUpdate.length}; On watchlist: ${devices.length}`,
      this.detectedDevices.length > 0 ? 'yellow' : 'green',
    )
    const switchNotification = (
      details: Extract<
        NotificationDetails,
        { id: 'lowBattery' | 'offlineSensor' | 'noSensorUpdate' }
      >,
      alertsEnabled: boolean,
    ) => {
      const isOn = alertsEnabled && (details.payload?.devices.length ?? 0) > 0
      if (isOn) {
        notifications.emit({ ...details, enabled: true })
      } else {
        notifications.emit({
          id: details.id,
          enabled: false,
          payload: undefined,
        })
      }
    }
    switchNotification(
      {
        id: 'lowBattery',
        payload: {
          devices: bat.map((d) => ({
            name: d.name,
            batteryPercentage: d.batteryPercentage ?? null,
          })),
        },
      },
      this.batteryLevelAlertToggle.isOn,
    )
    switchNotification(
      {
        id: 'offlineSensor',
        payload: {
          devices: off.map((d) => ({
            name: d.name,
            reason: d.offlineReason ?? 'unknown',
          })),
        },
      },
      this.selfDiagnosticAlertToggle.isOn,
    )
    switchNotification(
      {
        id: 'noSensorUpdate',
        payload: {
          devices: noUpdate.map((d) => ({
            name: d.name,
            hoursSinceLastReport: d.hoursSinceLastReport ?? null,
          })),
        },
      },
      this.selfDiagnosticAlertToggle.isOn,
    )
  }

  private getDeviceConfig(entityId: string) {
    return devices.find((device) => device.entityId === entityId)
  }

  private shouldReport(metadata: DetectedDeviceMetadata) {
    return (
      metadata.lowBattery ||
      ((metadata.offline || metadata.noUpdate) && metadata.monitored)
    )
  }

  private withValidLastReported(state: EntityState): EntityState {
    return Number.isNaN(Date.parse(state.lastReported))
      ? { ...state, lastReported: new Date().toISOString() }
      : state
  }

  private checkForMissingUpdates() {
    devices
      .filter(
        (config) =>
          config.monitoring === 'entity' &&
          config.maxHoursWithoutUpdate !== undefined,
      )
      .forEach((config) => {
        const state = this.latestStates.get(config.entityId)
        if (!state) return
        const metadata = this.checkDevice(state)
        this.updateList(metadata, this.shouldReport(metadata))
      })
  }

  private checkDevice(state: EntityState): DetectedDeviceMetadata {
    const config = this.getDeviceConfig(state.id)
    const battery = parseBatteryReading(state)
    const entity = Entity.general(state.id, {
      initialState: state,
      subscribeToUpdates: false,
    })
    const result: DetectedDeviceMetadata = {
      entityId: entity.entityId,
      name: config?.name || battery?.name || entity.entityId,
      lowBattery: false,
      offline: false,
      noUpdate: false,
      monitored: !!config,
    }
    if (entity.isUnavailable) {
      result.offline = true
      result.offlineReason =
        state.state === 'unavailable' ? 'unavailable' : 'unknown'
    } else {
      result.lowBattery =
        battery?.level !== undefined &&
        battery.level >= 0 &&
        battery.level < this.BATTERY_LOW_THRESHOLD
      if (result.lowBattery) result.batteryPercentage = battery?.level
      if (
        config?.monitoring === 'entity' &&
        config.maxHoursWithoutUpdate !== undefined
      ) {
        const lastReportTimestamp = Date.parse(state.lastReported)
        result.noUpdate =
          !Number.isNaN(lastReportTimestamp) &&
          Date.now() - lastReportTimestamp >=
            config.maxHoursWithoutUpdate * 60 * 60 * 1000
        if (result.noUpdate) {
          result.hoursSinceLastReport = Math.floor(
            (Date.now() - lastReportTimestamp) / (60 * 60 * 1000),
          )
        }
      }
    }
    return result
  }
}

export default DeviceMonitorService
