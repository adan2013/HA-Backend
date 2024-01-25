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
    description:
      'This is a test notification with low priority and quick action button',
    canBeDismissed: false, // always can be dismissed if triggered manually by the user
  },
  {
    id: 'loadedWashingMachine',
    title: 'Laundry is ready',
    description: 'Unload the washing machine and mark the device as empty',
    light: 'green',
    ignoreDND: true,
  },
  {
    id: 'deadlineWarning',
    title: 'Upcoming deadline detected',
    description:
      'One of your deadline intervals is coming to and end. Take an action and reset the date',
  },
  {
    id: 'mainDoorOpen',
    title: 'The main door is open',
    description:
      'Remember to close the main door and use the deadbolt to secure the house',
    priorityOrder: 'medium',
    light: 'yellow',
    ignoreDND: true,
  },
  {
    id: 'mainDoorOpenAlert',
    title: 'The main door is open',
    description:
      'The main door is open too long. Sound alert has been triggered',
    priorityOrder: 'medium',
    light: 'red',
    sound: 'scaleUp',
    ignoreDND: true,
  },
]

export default notificationConfig
