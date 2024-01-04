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
    canBeDismissed: true,
  },
  {
    id: 'loadedWashingMachine',
    title: 'Laundry is ready',
    description: 'Unload the washing machine and mark the device as empty',
    light: 'green',
    ignoreDND: true,
  },
  {
    id: 'waterFilterInspection',
    title: 'Water filter inspection',
    description: 'One of your water filters needs to be inspected and replaced',
  },
]

export default notificationConfig
