type Priority = 'low' | 'medium' | 'high'

export type NotificationLight =
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'redFlashing'
  | 'blueFlashing'

export type SoundType = 'scaleUp' | 'doubleBeep' | 'alarm'

export type NotificationConfig = {
  id: string
  title: string
  description: string
  priorityOrder?: Priority
  light?: NotificationLight
  sound?: SoundType
  canBeDismissed?: boolean
  ignoreDND?: boolean
}

export type NotificationPayload = {
  id: string
  title: string
  description: string
  extraInfo?: string
  priorityOrder: Priority
  light?: NotificationLight
  canBeDismissed?: boolean
  ignoreDND?: boolean
  createdAt: string
}
