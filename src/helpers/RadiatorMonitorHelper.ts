import Helper from './Helper'
import Entity from '../entities/Entity'
import HomeAssistantEntity from '../entities/HomeAssistantEntity'
import NumberEntity from '../entities/NumberEntity'
import formatDateTime from '../utils/formatDateTime'
import { Status } from '../services/types'

export type RadiatorMonitorConfig = {
  name: string
  thermometerEntityId: string
  externalTemperatureEntityId: string
  temperatureSensorEntityId: string
  resendAfterMinutes: number
  precision?: number
}

class RadiatorMonitorHelper extends Helper {
  private readonly precision: number
  private readonly resendIntervalMs: number
  private readonly thermometer: HomeAssistantEntity
  private readonly externalTemperature: NumberEntity
  private readonly temperatureSensor: HomeAssistantEntity
  private lastSentValue: number | null = null
  private lastSentAt: Date | null = null
  private nextSyncAt: Date | null = null
  private resendTimer: NodeJS.Timeout | null = null
  private needsSync = true

  constructor(config: RadiatorMonitorConfig) {
    super('radiatorMonitor', config.name)
    this.precision = config.precision ?? 1
    this.resendIntervalMs = config.resendAfterMinutes * 60 * 1000
    if (
      !Number.isInteger(this.precision) ||
      this.precision < 0 ||
      this.precision > 100
    ) {
      throw new Error('Precision must be an integer between 0 and 100')
    }
    if (
      !Number.isFinite(this.resendIntervalMs) ||
      this.resendIntervalMs <= 0 ||
      this.resendIntervalMs > 2147483647
    ) {
      throw new Error('Resend interval must be positive and fit in a timer')
    }
    this.thermometer = Entity.general(config.thermometerEntityId)
    this.externalTemperature = Entity.number(config.externalTemperatureEntityId)
    this.temperatureSensor = Entity.general(config.temperatureSensorEntityId)
    this.thermometer.onAnyStateUpdate(() => this.sync())
    this.externalTemperature.onAnyStateUpdate(() => this.sync())
    this.temperatureSensor.onAnyStateUpdate(() => this.updateStatus())
    this.sync()
  }

  private getRoomTemperature(): number | null {
    const state = this.thermometer.state?.state
    if (this.thermometer.isUnavailable || !state?.trim()) return null
    const value = Number(state)
    if (!Number.isFinite(value) || value < 0 || value > 99.9) return null
    const precisionPower = 10 ** this.precision
    const roundedValue = Math.round(value * precisionPower) / precisionPower
    return roundedValue <= 99.9 ? roundedValue : null
  }

  private getSyncIssue(): string | null {
    if (this.thermometer.isUnavailable) return 'Room thermometer is unavailable'
    if (this.getRoomTemperature() === null) {
      return 'Room temperature is invalid (expected 0–99.9°C)'
    }
    if (this.externalTemperature.isUnavailable) return 'Radiator is unavailable'
    return null
  }

  private sync() {
    const value = this.getRoomTemperature()
    if (value === null || this.getSyncIssue()) {
      this.needsSync = true
    } else if (
      this.needsSync ||
      value !== this.lastSentValue ||
      !this.lastSentAt ||
      Date.now() - this.lastSentAt.getTime() >= this.resendIntervalMs
    ) {
      // Record the send first so an immediate state echo cannot trigger a loop.
      this.lastSentValue = value
      this.lastSentAt = new Date()
      this.needsSync = false
      this.externalTemperature.setValue(value)
    }
    this.scheduleResend()
    this.updateStatus()
  }

  private scheduleResend() {
    if (this.resendTimer) clearTimeout(this.resendTimer)
    const dueAt = this.lastSentAt
      ? this.lastSentAt.getTime() + this.resendIntervalMs
      : 0
    // When unavailable, retry later rather than spinning on an overdue send.
    this.nextSyncAt = new Date(
      dueAt > Date.now() ? dueAt : Date.now() + this.resendIntervalMs,
    )
    this.resendTimer = setTimeout(
      () => this.sync(),
      this.nextSyncAt.getTime() - Date.now(),
    )
    this.resendTimer.unref()
  }

  private getSensorStatus(): Status {
    const mode = this.temperatureSensor.state?.state
    if (this.temperatureSensor.isUnavailable) {
      return { message: 'unavailable', color: 'red' }
    }
    switch (mode) {
      case 'external':
      case 'remote_temperature':
        return { message: `${mode} (room thermometer)`, color: 'green' }
      case 'external_3':
        return {
          message: 'external_3 (room thermometer restored)',
          color: 'green',
        }
      case 'external_2':
      case 'remote_source_offline':
        return {
          message: `${mode} (fallback to built-in sensor; external updates missing)`,
          color: 'yellow',
        }
      case 'internal':
      case 'local_temperature':
        return { message: `${mode} (built-in sensor)`, color: 'yellow' }
      default:
        return { message: `${mode} (unrecognized mode)`, color: 'yellow' }
    }
  }

  private updateStatus() {
    const issue = this.getSyncIssue()
    const sensor = this.getSensorStatus()
    const value = this.getRoomTemperature()
    const nextSync = this.nextSyncAt
      ? formatDateTime(this.nextSyncAt)
      : 'pending'
    const message = [
      `Room: ${value === null ? 'unavailable/invalid' : `${value}°C`}`,
      `Radiator input: ${this.externalTemperature.state?.state ?? 'unknown'}`,
      `Sensor: ${sensor.message}`,
      `Last sent: ${
        this.lastSentValue === null ? 'never' : `${this.lastSentValue}°C`
      }`,
      `Sent at: ${this.lastSentAt ? formatDateTime(this.lastSentAt) : 'never'}`,
      `Resend after: ${this.resendIntervalMs / 60000} min idle`,
      issue
        ? `Sync paused: ${issue}; retry at: ${nextSync}`
        : `Next resend: ${nextSync}`,
    ].join(' | ')
    this.setHelperStatus(message, issue ? 'red' : sensor.color)
  }
}

export default RadiatorMonitorHelper
