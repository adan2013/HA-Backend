import { NotificationConfig } from '../services/NotificationsService/types'

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
    id: 'backendStarted',
    title: 'System restarted',
    description:
      'The backend service has been started successfully. If you did not start it, please check the logs and verify the health of the system',
    priorityOrder: 'high',
    light: 'purple',
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
    id: '3dPrintFinished',
    title: '3D print finished',
    description:
      'The 3D print has been finished. Remove the print from the printer',
    light: 'green',
    canBeDismissed: true,
  },
  {
    id: 'deadlineWarning',
    title: 'Upcoming deadline',
    description:
      'One of your deadline intervals are coming to and end. Take an action and reset the date',
    canBeDismissed: true,
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
  {
    id: 'waterLeak',
    title: 'Water leak detected',
    description:
      'One of the water leak sensors has been triggered. Check the source of the leak and turn off the water supply! To reset the alarm, turn off and on the water leak protection toggle',
    priorityOrder: 'high',
    light: 'redFlashing',
    sound: 'alarm',
    ignoreDND: true,
  },
  {
    id: 'lowBattery',
    title: 'Low battery detected',
    description:
      'One of your sensors has low battery. Replace the battery as soon as possible',
    priorityOrder: 'low',
    light: 'blue',
    canBeDismissed: true,
  },
  {
    id: 'offlineSensor',
    title: 'Sensor is offline',
    description:
      'One of your important sensors is unavailable. Check the connection and battery level',
    priorityOrder: 'low',
    light: 'blue',
    canBeDismissed: true,
  },
  {
    id: 'weakSignal',
    title: 'Weak sensor signal',
    description:
      'One of your important sensors has weak signal. Check the connection and battery level',
    priorityOrder: 'low',
    canBeDismissed: true,
  },
  {
    id: 'manualKitchenLights',
    title: 'Kitchen lights are on',
    description:
      'The kitchen lights are in manual mode. Turn off the lights to go back to automatic mode',
    priorityOrder: 'low',
    canBeDismissed: true,
  },
]

export default notificationConfig
