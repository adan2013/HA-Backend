import ReminderService from '../../ReminderService'
import Entity from '../../../../entities/Entity'
import StateMachine from '../../../../helpers/StateMachine'
import { notifications } from '../../../../events/events'
import Entities from '../../../../configs/entities.config'

type MainDoorState = 'closed' | 'open' | 'openAlert'

const ALERT_DELAY = 90000

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
    ],
    onStateChange: (newState) => {
      if (reminderService.isDisabled) return
      notifications.emit({
        id: 'mainDoorOpen',
        enabled: newState === 'open',
      })
      notifications.emit({
        id: 'mainDoorOpenAlert',
        enabled: newState === 'openAlert',
      })
    },
  })
  reminderService.registerHelper(stateMachine)
  const checkDoorState = () => {
    if (reminderService.isDisabled) return
    const isOpen = deadboltSensor.isOn && alertToggle.isOn
    stateMachine.setState(isOpen ? 'open' : 'closed')
  }
  alertToggle.onChange(() => checkDoorState())
  deadboltSensor.onAnyStateUpdate(() => checkDoorState())
  checkDoorState()
}
