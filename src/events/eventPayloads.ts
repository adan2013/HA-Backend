import { EntityState } from '../connectors/types'

export type WebSocketIncomingMessagePayload = {
  message: {
    accessToken?: string
    requestId?: string
    subscriptionId?: string
    entityId?: string | string[]
    domain?: string
    service?: string
    data?: object
    attribute?: string
    notificationId?: string
    serviceName?: string
    enabled?: boolean
    id?: string
    value?: string
  }
  sendResponse: (msgType: string, payload: object) => void
}

export type ServiceDataUpdatePayload = {
  serviceName: string
  data: object
}

export type HomeAssistantSyncPayload = {
  entitiesCount: number
}

export type HomeAssistantStatusPayload = {
  status: 'synced' | 'authorized' | 'connected' | 'disconnected' | 'authError'
}

export type HomeAssistantCallbackPayload = (payload: any) => void

export type ServiceCallPayload = {
  domain: string
  service: string
  entityId?: string | string[]
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
