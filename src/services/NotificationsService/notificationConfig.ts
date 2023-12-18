import { NotificationConfig } from './types'

const notificationConfig: NotificationConfig[] = [
  {
    id: 'test1',
    title: 'Test notification',
    description:
      'This is a test notification with high priority, red light and sound alert',
    priorityOrder: 'high',
    light: 'red',
    sound: 'scaleUp',
    canBeDismissed: true,
  },
  {
    id: 'test2',
    title: 'Test notification',
    description:
      'This is a test notification with sound alert and yellow light which can ignore DND mode',
    priorityOrder: 'medium',
    light: 'yellow',
    sound: 'doubleBeep',
    canBeDismissed: true,
    ignoreDND: true,
  },
  {
    id: 'test3',
    title: 'Test notification',
    description: 'This is a test notification with low priority',
    canBeDismissed: true,
  },
  {
    id: 'loadedWashingMachine',
    title: 'Laundry is ready',
    description:
      'Unload the washing machine and mark state the device as empty',
    light: 'green',
    sound: 'doubleBeep',
    ignoreDND: true,
  },
]

export default notificationConfig
