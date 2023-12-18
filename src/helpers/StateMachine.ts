import Helper from './Helper'

export type AutoResetRule<T> = {
  from: T
  to: T
  delay: number
}

class StateMachine<T> extends Helper {
  private readonly onStateChange?: (newState: T, oldState: T) => void
  private readonly autoResetRules: AutoResetRule<T>[]
  private timer: NodeJS.Timeout | null = null
  private state: T

  get currentState() {
    return this.state
  }

  constructor(
    name: string,
    defaultState: T,
    onStateChange?: (newState: T, oldState: T) => void,
    autoStateResetRules?: AutoResetRule<T>[],
  ) {
    super('stateMachine', name)
    this.state = defaultState
    this.updateStatus()
    this.onStateChange = onStateChange
    this.autoResetRules = autoStateResetRules || []
  }

  public setState(state: T) {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const oldState = this.state
    this.state = state
    this.updateStatus()
    this.onStateChange?.(this.state, oldState)
    const autoResetRule = this.autoResetRules.find((r) => r.from === state)
    if (autoResetRule) {
      this.timer = setTimeout(() => {
        this.timer = null
        this.setState(autoResetRule.to)
      }, autoResetRule.delay)
    }
  }

  private updateStatus() {
    this.setHelperStatus(`State: ${this.state}`)
  }
}

export default StateMachine
