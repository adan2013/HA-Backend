import ReminderService from '../../ReminderService'
import HomeAssistantEntity from '../../../../entities/HomeAssistantEntity'
import Entity from '../../../../entities/Entity'
import { notifications } from '../../../../events/events'
import Timer from '../../../../Timer'
import { deadlines } from './deadlineConfig'
import { getDaysToDeadline } from './utils'

export const initDeadlinesWatchdog = (reminderService: ReminderService) => {
  const entites: HomeAssistantEntity[] = deadlines.map((dl) =>
    Entity.general(dl.entityId),
  )
  const checkDeadlines = () => {
    if (reminderService.isDisabled) return
    const detectedWarnings: string[] = []
    deadlines.forEach((deadline) => {
      const entity = entites.find((e) => e.entityId === deadline.entityId)
      if (entity && !entity.isUnavailable) {
        const daysLeft = getDaysToDeadline(
          entity.state?.state,
          deadline.interval,
        )
        if (daysLeft <= deadline.warningThreshold) {
          detectedWarnings.push(deadline.label)
        }
      }
    })
    const warningsDetected = detectedWarnings.length > 0
    notifications.emit({
      id: 'deadlineWarning',
      enabled: warningsDetected,
      extraInfo: warningsDetected ? detectedWarnings.join(', ') : undefined,
    })
  }
  entites.forEach((e) => e.onAnyStateUpdate(() => checkDeadlines()))
  Timer.onTime(7, 0, () => checkDeadlines())
  checkDeadlines()
}
