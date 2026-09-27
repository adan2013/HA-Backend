import ReminderService from '../../ReminderService'
import Entity from '../../../../entities/Entity'
import StateMachine from '../../../../helpers/StateMachine'
import { notifications, smsGateway } from '../../../../events/events'
import Entities from '../../../../configs/entities.config'

type MainDoorState = 'closed' | 'open' | 'openAlert' | 'openSmsSent'

const ALERT_DELAY = 90000
const SMS_DELAY = 30000

export const alertToggleId = Entities.inputBoolean.security.deadboltMonitoring
export const deadboltSensorId = Entities.binarySensor.contact.mainDoorDeadbolt

export const initMainDoorDeadboltWatchdog = (
  reminderService: ReminderService,
) => {
  const alertToggle = Entity.toggle(alertToggleId)
  const deadboltSensor = Entity.general(deadboltSensorId)
  const stateMachine = new StateMachine<MainDoorState>({
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
    onStateChange: (newState, oldState) => {
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
    },
  })
  reminderService.registerHelper(stateMachine)
  const checkDoorState = () => {
    const isOpen = deadboltSensor.isOn && alertToggle.isOn
    if (!isOpen || stateMachine.currentState === 'closed') {
      stateMachine.setState(isOpen ? 'open' : 'closed')
    }
  }
  alertToggle.onChange(() => checkDoorState())
  deadboltSensor.onAnyStateUpdate(() => checkDoorState())
  checkDoorState()
}
