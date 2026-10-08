import Service from '../Service'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'
import Entity from '../../entities/Entity'
import { notifications } from '../../events/events'
import Timer from '../../Timer'
import { getDaysToDeadline } from './utils'
import deadlines from '../../configs/deadline.config'

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
    const warningLabels: string[] = []
    deadlines.forEach((deadline) => {
      const entity = this.entities.find((e) => e.entityId === deadline.entityId)
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
    this.setServiceStatus(
      `Deadline count: ${deadlines.length}; Warnings: ${
        warningsDetected ? warningLabels.join(', ') : 'none'
      }`,
      warningsDetected ? 'yellow' : 'green',
    )
  }
}

export default DeadlinesService
