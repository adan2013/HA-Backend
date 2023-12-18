import { EntityState } from '../connectors/types'

export type WebSocketIncomingMessagePayload = {
  message: {
    notificationId?: string
    serviceName?: string
    enabled?: boolean
  }
  sendResponse: (msgType: string, payload: object) => void
}

export type ServiceDataUpdatePayload = {
  serviceName: string
  data: object
}

export type HomeAssistantCallbackPayload = (payload: any) => void

export type ServiceCallPayload = {
  domain: string
  service: string
  entityId?: string
  data?: object
}

export type EntityStatePayload = {
  entityId: string
  callback: (state: EntityState) => void
}

export type NotificationsPayload = {
  id: string
  enabled: boolean
  extraInfo?: string
}
