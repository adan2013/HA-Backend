import Service from '../Service'
import { NotificationLight, NotificationPayload } from './types'
import notificationConfig from '../../configs/notification.config'
import { notifications, webSocketMessage } from '../../events/events'
import Entity from '../../entities/Entity'
import WS_CMD from '../../connectors/wsCommands'
import { createLogger } from '../../logging/logger'
import { playSoundAlert, switchNotificationLight } from './notificationUtils'
import Entities from '../../configs/entities.config'
import TimeRangeSchedule from '../../scheduling/TimeRangeSchedule'

const logger = createLogger('NotificationsService')

class NotificationsService extends Service {
  private tabletLightToggle = Entity.toggle(
    Entities.inputBoolean.notifications.tabletLight,
  )
  private soundToggle = Entity.toggle(
    Entities.inputBoolean.notifications.soundOn,
  )
  private dndAtNightToggle = Entity.toggle(
    Entities.inputBoolean.notifications.dndAtNight,
  )
  private notificationLight = Entity.rgbLight(
    Entities.light.dashNode.tabletLight,
  )
  private activeNotifications: NotificationPayload[] = []
  private dndSchedule: TimeRangeSchedule
  public dndIsActive = false
  public lastActiveLight: NotificationLight | null = null

  get count() {
    return this.activeNotifications.length
  }

  constructor() {
    super('notifications')
    switchNotificationLight(this.notificationLight)
    notifications.on((payload) => {
      if (payload.enabled) {
        this.addNotification(payload.id, payload.extraInfo)
      } else {
        this.removeNotification(payload.id)
      }
    })
    this.updateCollection()
    this.tabletLightToggle.onChange(() => this.updateNotificationLight())
    this.dndAtNightToggle.onChange(() => this.updateDndMode())
    this.dndSchedule = new TimeRangeSchedule(
      Entity.inputText(Entities.inputText.schedule.alertDnd),
      () => this.updateDndMode(),
      () => this.updateDndMode(),
    )
    webSocketMessage(WS_CMD.incoming.TRIGGER_NOTIFICATION).on(
      ({ message: { notificationId } }) => {
        if (notificationId) {
          this.addNotification(
            notificationId,
            'Notification triggered manually',
            true,
          )
        }
      },
    )
    webSocketMessage(WS_CMD.incoming.DISMISS_NOTIFICATION).on(
      ({ message: { notificationId } }) => {
        if (notificationId) {
          this.removeNotification(notificationId)
        }
      },
    )
  }

  public getNotifications() {
    return [...this.activeNotifications]
  }

  private updateCollection() {
    this.setServiceStatus(
      `Active notifications: ${this.count}, DND mode: ${
        this.dndIsActive ? 'ON' : 'OFF'
      }`,
    )
    this.setServiceData({
      active: this.activeNotifications,
      availableIds: notificationConfig.map((n) => n.id),
      dndMode: this.dndIsActive,
    })
  }

  private updateNotificationLight() {
    if (!this.tabletLightToggle.isOn || this.count === 0) {
      switchNotificationLight(this.notificationLight)
      this.lastActiveLight = null
      return
    }
    const notificationWithLight = this.activeNotifications.find((n) => {
      if (n.light) {
        if (n.ignoreDND || !this.dndIsActive) {
          return true
        }
      }
      return false
    })
    switchNotificationLight(
      this.notificationLight,
      notificationWithLight?.light,
    )
    this.lastActiveLight = notificationWithLight?.light || null
  }

  public updateDndMode() {
    let newDndState = false
    if (this.dndAtNightToggle.isOn) {
      if (this.dndSchedule.isValid) {
        newDndState = this.dndSchedule.isActiveAt()
      } else {
        logger.error('Cannot enable DND with an invalid schedule', {
          entityId: Entities.inputText.schedule.alertDnd,
        })
      }
    }
    if (newDndState !== this.dndIsActive) {
      this.dndIsActive = newDndState
      this.updateCollection()
      this.updateNotificationLight()
    }
  }

  private sortNotificationsByPriority() {
    const highPriority = this.activeNotifications.filter(
      (n) => n.priorityOrder === 'high',
    )
    const mediumPriority = this.activeNotifications.filter(
      (n) => n.priorityOrder === 'medium',
    )
    const lowPriority = this.activeNotifications.filter(
      (n) => n.priorityOrder === 'low',
    )
    this.activeNotifications = [
      ...highPriority,
      ...mediumPriority,
      ...lowPriority,
    ]
  }

  private addNotification(
    id: string,
    extraInfo?: string,
    alwaysCanBeDismissed = false,
  ) {
    const existingNotification = this.activeNotifications.find(
      (n) => n.id === id,
    )
    if (existingNotification) {
      if (existingNotification.extraInfo === extraInfo) {
        return
      }
      this.activeNotifications = this.activeNotifications.filter(
        (n) => n.id !== id,
      )
    }
    const config = notificationConfig.find((c) => c.id === id)
    if (config) {
      this.activeNotifications.unshift({
        id: config.id,
        title: config.title,
        description: config.description,
        extraInfo,
        priorityOrder: config.priorityOrder || 'low',
        light: config.light,
        canBeDismissed: config.canBeDismissed || alwaysCanBeDismissed,
        ignoreDND: config.ignoreDND,
        createdAt: new Date().toISOString(),
      })
      this.sortNotificationsByPriority()
      this.updateCollection()
      this.updateNotificationLight()
      if (this.soundToggle.isOn) {
        if (config.ignoreDND || !this.dndIsActive) {
          playSoundAlert(config.sound)
        }
      }
    } else {
      logger.error('Unknown notification id', { id })
    }
  }

  private removeNotification(id: string) {
    const initialCount = this.count
    this.activeNotifications = this.activeNotifications.filter(
      (n) => n.id !== id,
    )
    if (initialCount !== this.count) {
      this.updateCollection()
      this.updateNotificationLight()
    }
  }
}

export default NotificationsService
