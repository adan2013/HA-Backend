import Helper from './Helper'
import StateMachine from './StateMachine'

type ToggleState = 'on' | 'switching-on' | 'switching-off' | 'off'

export type ToggleConfig = {
  name: string
  threshold: number
  onDelay: number
  offDelay: number
  onToggleOn?: () => void
  onToggleOff?: () => void
  defaultState?: ToggleState
}

class DebouncedNumericToggle extends Helper {
  private readonly threshold: number
  private readonly stateMachine: StateMachine<ToggleState>

  constructor(config: ToggleConfig) {
    super('debouncedToggle', config.name)
    this.threshold = config.threshold
    this.stateMachine = new StateMachine<ToggleState>({
      name: config.name,
      defaultState: config.defaultState || 'off',
      autoStateResetRules: [
        { from: 'switching-on', to: 'on', delay: config.onDelay },
        { from: 'switching-off', to: 'off', delay: config.offDelay },
      ],
      onStateChange: (newState, oldState) => {
        this.updateStatus()
        if (
          newState === 'on' &&
          oldState === 'switching-on' &&
          config.onToggleOn
        ) {
          config.onToggleOn()
        }
        if (
          newState === 'off' &&
          oldState === 'switching-off' &&
          config.onToggleOff
        ) {
          config.onToggleOff()
        }
      },
    })
    this.updateStatus()
  }

  private updateStatus() {
    switch (this.stateMachine.currentState) {
      case 'switching-on':
        this.setHelperStatus(`Switching on...`, 'blue')
        break
      case 'switching-off':
        this.setHelperStatus(`Switching off...`, 'blue')
        break
      case 'on':
        this.setHelperStatus('Toggle is on', 'green')
        break
      case 'off':
        this.setHelperStatus('Toggle is off', 'red')
        break
    }
  }

  public inputValue(value: number) {
    if (value > this.threshold) {
      if (this.stateMachine.currentState === 'off') {
        this.stateMachine.setState('switching-on')
      }
      if (this.stateMachine.currentState === 'switching-off') {
        this.stateMachine.setState('on')
      }
    } else {
      if (this.stateMachine.currentState === 'on') {
        this.stateMachine.setState('switching-off')
      }
      if (this.stateMachine.currentState === 'switching-on') {
        this.stateMachine.setState('off')
      }
    }
  }
}

export default DebouncedNumericToggle
