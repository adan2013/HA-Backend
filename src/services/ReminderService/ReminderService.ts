import Service from '../Service'
import { initWashingMachineWatchdog } from './subtasks/washingMachine/washingMachineWatchdog'
import { initDeadlinesWatchdog } from './subtasks/deadlines/deadlinesWatchdog'
import { initMainDoorDeadboltWatchdog } from './subtasks/mainDoorDeadbolt/mainDoorDeadboltWatchdog'

class ReminderService extends Service {
  constructor() {
    super('reminder')
    initWashingMachineWatchdog(this)
    initDeadlinesWatchdog(this)
    initMainDoorDeadboltWatchdog(this)
  }
}

export default ReminderService
