import Service from '../Service'
import { initWashingMachineWatchdog } from './subtasks/washingMachine/washingMachineWatchdog'
import { initDeadlinesWatchdog } from './subtasks/deadlines/deadlinesWatchdog'
import { initMainDoorDeadboltWatchdog } from './subtasks/mainDoorDeadbolt/mainDoorDeadboltWatchdog'
import { init3dPrinterWatchdog } from './subtasks/3dPrinter/3dPrinterWatchdog'

class ReminderService extends Service {
  constructor() {
    super('reminder')
    initWashingMachineWatchdog(this)
    initDeadlinesWatchdog(this)
    initMainDoorDeadboltWatchdog(this)
    init3dPrinterWatchdog(this)
  }
}

export default ReminderService
