import Service from '../Service'
import Entity from '../../entities/Entity'
import StateMachine from '../../helpers/StateMachine'
import { notifications, smsGateway } from '../../events/events'
import Entities from '../../configs/entities.config'

type MainDoorState = 'closed' | 'open' | 'openAlert' | 'openSmsSent'

const ALERT_DELAY = 90000
const SMS_DELAY = 30000

export const alertToggleId = Entities.inputBoolean.security.deadboltMonitoring
export const deadboltSensorId = Entities.binarySensor.contact.mainDoorDeadbolt

class MainDoorService extends Service {
  private alertToggle = Entity.toggle(alertToggleId)
  private deadboltSensor = Entity.general(deadboltSensorId)
  private stateMachine = new StateMachine<MainDoorState>({
    name: 'deadbolt',
    defaultState: 'closed',
    autoStateResetRules: [
      {
        from: 'open',
        to: 'openAlert',
        delay: ALERT_DELAY,
      },
      {
        from: 'openAlert',
        to: 'openSmsSent',
        delay: SMS_DELAY,
      },
    ],
    onStateChange: (newState, oldState) =>
      this.onDoorStateChange(newState, oldState),
  })

  constructor() {
    super('mainDoor')
    this.registerHelper(this.stateMachine)
    this.alertToggle.onChange(() => this.checkDoorState())
    this.deadboltSensor.onAnyStateUpdate(() => this.checkDoorState())
    this.checkDoorState()
  }

  private checkDoorState() {
    const isOpen = this.deadboltSensor.isOn && this.alertToggle.isOn
    if (!isOpen || this.stateMachine.currentState === 'closed') {
      this.stateMachine.setState(isOpen ? 'open' : 'closed')
    }
  }

  private onDoorStateChange(newState: MainDoorState, oldState: MainDoorState) {
    notifications.emit({
      id: 'mainDoorOpen',
      enabled: newState === 'open',
    })
    notifications.emit({
      id: 'mainDoorOpenAlert',
      enabled: newState === 'openAlert' || newState === 'openSmsSent',
    })
    if (newState === 'openSmsSent' && oldState !== 'openSmsSent') {
      smsGateway.emit({
        source: 'mainDoorOpen',
        text: 'The main door is open.',
      })
    }
  }
}

export default MainDoorService
