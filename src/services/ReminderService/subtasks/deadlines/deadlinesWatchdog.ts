import ReminderService from '../../ReminderService'
import HomeAssistantEntity from '../../../../entities/HomeAssistantEntity'
import Entity from '../../../../entities/Entity'
import { notifications } from '../../../../events/events'
import Timer from '../../../../Timer'
import { getDaysToDeadline } from './utils'
import deadlines from '../../../../configs/deadline.config'

export const initDeadlinesWatchdog = (reminderService: ReminderService) => {
  const entites: HomeAssistantEntity[] = deadlines.map((dl) =>
    Entity.general(dl.entityId),
  )
  const checkDeadlines = () => {
    if (reminderService.isDisabled) return
    const warningLabels: string[] = []
    deadlines.forEach((deadline) => {
      const entity = entites.find((e) => e.entityId === deadline.entityId)
      if (entity && !entity.isUnavailable) {
        const daysLeft = getDaysToDeadline(
          entity.state?.state,
          deadline.interval,
        )
        if (daysLeft <= deadline.warningThreshold) {
          warningLabels.push(deadline.label)
        }
      }
    })
    const warningsDetected = warningLabels.length > 0
    notifications.emit({
      id: 'deadlineWarning',
      enabled: warningsDetected,
      extraInfo: warningsDetected ? warningLabels.join(', ') : undefined,
    })
  }
  entites.forEach((e) => e.onAnyStateUpdate(() => checkDeadlines()))
  Timer.onTime(7, 0, () => checkDeadlines())
  checkDeadlines()
}
