import {
  NotificationIconName,
  NotificationId,
  NotificationLight,
} from './notificationContract'
export { NotificationLight, NotificationPayload } from './notificationContract'

export type SoundType = 'scaleUp' | 'doubleBeep' | 'alarm'

export type NotificationConfig = {
  id: NotificationId
  icon: NotificationIconName
  title: string
  priorityOrder?: 'low' | 'medium' | 'high'
  light?: NotificationLight
  sound?: SoundType
  canBeDismissed?: boolean
  ignoreDND?: boolean
}
