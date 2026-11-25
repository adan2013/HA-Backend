import Helper from './Helper'
import { ValueHelperStatus } from '../services/types'

class ValueHelper<T extends number | string> extends Helper {
  private value: T | null = null
  private updatedAt: string | null = null
  private error: string | null = null

  constructor(name: string, initialValue?: T) {
    super('value', name)
    this.setHelperStatus('-', 'blue')
    if (initialValue !== undefined) this.setValue(initialValue)
  }

  public setValue(value: T) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('ValueHelper requires a finite number')
    }
    this.value = value
    this.updatedAt = new Date().toISOString()
    this.error = null
    this.setHelperStatus(String(value), 'green')
  }

  public setError(message: string) {
    this.error = message
    this.setHelperStatus(message, 'red')
  }

  public getHelperStatus(): ValueHelperStatus {
    return {
      ...super.getHelperStatus(),
      value: this.value,
      updatedAt: this.updatedAt,
      error: this.error,
    }
  }
}

export default ValueHelper
