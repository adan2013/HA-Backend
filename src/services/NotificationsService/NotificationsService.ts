import Service from '../Service'
import { NotificationLight, NotificationPayload } from './types'
import notificationConfig from '../../configs/notification.config'
import { notifications, webSocketMessage } from '../../events/events'
import Entity from '../../entities/Entity'
import Timer from '../../Timer'
import WS_CMD from '../../connectors/wsCommands'
import { playSoundAlert, switchNotificationLight } from './notificationUtils'

class NotificationsService extends Service {
  private tabletLightToggle = Entity.toggle('input_boolean.alerttabletlights')
  private soundToggle = Entity.toggle('input_boolean.alertsounds')
  private dndAtNightToggle = Entity.toggle('input_boolean.alertdndatnight')
  private notificationLight = Entity.rgbLight(
    'light.dash_node_tablet_notification_lights',
  )
  private activeNotifications: NotificationPayload[] = []
  private DND_START_AT = 22
  private DND_END_AT = 7
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
    Timer.onTime(this.DND_START_AT, 0, () => this.updateDndMode())
    Timer.onTime(this.DND_END_AT, 0, () => this.updateDndMode())
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
      const currentHr = new Date().getHours()
      if (currentHr >= this.DND_START_AT || currentHr < this.DND_END_AT) {
        newDndState = true
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
    if (this.isDisabled) return
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
      this.activeNotifications.push({
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
      console.error('Unknown notification id:', id)
    }
  }

  private removeNotification(id: string) {
    if (this.isDisabled) return
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
