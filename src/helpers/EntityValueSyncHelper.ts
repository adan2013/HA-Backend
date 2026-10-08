import Helper from './Helper'
import Entity from '../entities/Entity'
import HomeAssistantEntity from '../entities/HomeAssistantEntity'
import NumberEntity from '../entities/NumberEntity'
import formatDateTime from '../utils/formatDateTime'

export type EntityValueSyncConfig = {
  name: string
  sourceEntityId: string
  targetEntityId: string
  precision?: number
}

class EntityValueSyncHelper extends Helper {
  private readonly precision: number | undefined
  private readonly source: HomeAssistantEntity
  private readonly target: NumberEntity
  private lastSyncedValue: number | null = null
  private lastSyncDate = new Date()

  constructor(config: EntityValueSyncConfig) {
    super('entityValueSync', config.name)
    if (config.precision !== undefined && config.precision < 0) {
      throw new Error('Precision must be greater or equal to 0')
    }
    this.precision = config.precision
    this.source = Entity.general(config.sourceEntityId)
    this.target = Entity.number(config.targetEntityId)
    this.source.onAnyStateUpdate(() => this.sync())
    this.target.onAnyStateUpdate(() => this.sync())
    this.sync()
  }

  private roundValue(value: number): number {
    if (this.precision === undefined) return value
    const precisionPower = 10 ** this.precision
    return Math.round(value * precisionPower) / precisionPower
  }

  private sync() {
    if (this.source.isUnavailable) {
      this.setHelperStatus('Source entity is unavailable', 'red')
      return
    }
    if (this.target.isUnavailable) {
      this.lastSyncedValue = null
      this.setHelperStatus('Target entity is unavailable', 'red')
      return
    }
    const value = Number(this.source.state?.state)
    if (Number.isNaN(value)) {
      this.setHelperStatus('Source value is not a number', 'red')
      return
    }
    const roundedValue = this.roundValue(value)
    if (roundedValue !== this.lastSyncedValue) {
      this.target.setValue(roundedValue)
      this.lastSyncedValue = roundedValue
      this.lastSyncDate = new Date()
    }
    this.setHelperStatus(
      `Last value: ${roundedValue} | Synced at: ${formatDateTime(
        this.lastSyncDate,
      )}`,
      'green',
    )
  }

  public getLastSyncedValue() {
    return this.lastSyncedValue
  }
}

export default EntityValueSyncHelper
