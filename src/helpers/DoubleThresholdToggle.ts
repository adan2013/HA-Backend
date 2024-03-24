import Helper from './Helper'
import { StatusColor } from '../services/types'

export type ToggleState = 'above' | 'below' | 'between' | 'unknown'

export type DoubleThresholdToggleConfig = {
  name: string
  upperThreshold: number
  lowerThreshold: number
  onChange?: (state: ToggleState) => void
}

class DoubleThresholdToggle extends Helper {
  private readonly config: DoubleThresholdToggleConfig
  private state: ToggleState = 'unknown'
  private lastValue = 0

  constructor(config: DoubleThresholdToggleConfig) {
    super('doubleThresholdToggle', config.name)
    this.config = config
    this.updateStatus()
  }

  private updateStatus() {
    let statusColor: StatusColor
    switch (this.state) {
      case 'above':
      case 'below':
        statusColor = 'green'
        break
      case 'between':
        statusColor = 'yellow'
        break
      default:
        statusColor = 'none'
    }
    this.setHelperStatus(
      `Last received value: ${
        this.lastValue
      } | State: ${this.state.toString()}`,
      statusColor,
    )
  }

  private updateState(state: ToggleState) {
    if (state === this.state) {
      return
    }
    this.state = state
    if (this.config.onChange) {
      this.config.onChange(state)
    }
    this.updateStatus()
  }

  public getCurrentState() {
    return this.state
  }

  public getLastValue() {
    return this.lastValue
  }

  public inputValue(value: number) {
    this.lastValue = value
    if (value >= this.config.upperThreshold) {
      this.updateState('above')
    } else if (value <= this.config.lowerThreshold) {
      this.updateState('below')
    } else {
      this.updateState('between')
    }
  }
}

export default DoubleThresholdToggle
