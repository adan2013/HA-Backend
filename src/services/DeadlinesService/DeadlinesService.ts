import Service from '../Service'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'
import Entity from '../../entities/Entity'
import { notifications } from '../../events/events'
import Timer from '../../Timer'
import { getDaysToDeadline } from './utils'
import deadlines from '../../configs/deadline.config'
import { NotificationPayloadMap } from '../NotificationsService/notificationContract'

class DeadlinesService extends Service {
  private entities: HomeAssistantEntity[]

  constructor() {
    super('deadlines')
    this.entities = deadlines.map((dl) => Entity.general(dl.entityId))
    this.entities.forEach((e) =>
      e.onAnyStateUpdate(() => this.checkDeadlines()),
    )
    Timer.onTime(7, 0, () => this.checkDeadlines())
    this.checkDeadlines()
  }

  private checkDeadlines() {
    const warningDeadlines: NotificationPayloadMap['deadlineWarning']['deadlines'] =
      []
    deadlines.forEach((deadline) => {
      const entity = this.entities.find((e) => e.entityId === deadline.entityId)
      if (entity && !entity.isUnavailable) {
        const daysLeft = getDaysToDeadline(
          entity.state?.state,
          deadline.interval,
        )
        if (daysLeft <= deadline.warningThreshold) {
          warningDeadlines.push({ label: deadline.label, daysLeft })
        }
      }
    })
    const warningsDetected = warningDeadlines.length > 0
    notifications.emit({
      id: 'deadlineWarning',
      enabled: warningsDetected,
      payload: warningsDetected ? { deadlines: warningDeadlines } : undefined,
    })
    this.setServiceStatus(
      `Deadline count: ${deadlines.length}; Warnings: ${
        warningsDetected
          ? warningDeadlines.map((deadline) => deadline.label).join(', ')
          : 'none'
      }`,
      warningsDetected ? 'yellow' : 'green',
    )
  }
}

export default DeadlinesService
