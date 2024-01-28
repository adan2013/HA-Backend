import TypedEvent from './TypedEvent'
import {
  HomeAssistantCallbackPayload,
  ServiceDataUpdatePayload,
  WebSocketIncomingMessagePayload,
  ServiceCallPayload,
  EntityStatePayload,
  NotificationsPayload,
  HomeAssistantSyncPayload,
} from './eventPayloads'
import { EntityState } from '../connectors/types'

export const serviceDataUpdate = new TypedEvent<ServiceDataUpdatePayload>(
  'ws/dataUpdate',
)

export const webSocketMessage = (topic: string) =>
  new TypedEvent<WebSocketIncomingMessagePayload>('ws/incoming', topic)

export const homeAssistantSync = new TypedEvent<HomeAssistantSyncPayload>(
  'ha/sync',
)

export const homeAssistantEvent = (msgId: number) =>
  new TypedEvent<HomeAssistantCallbackPayload>('ha/event', msgId.toString())

export const homeAssistantResult = (msgId: number) =>
  new TypedEvent<HomeAssistantCallbackPayload>('ha/result', msgId.toString())

export const entityUpdate = (entityId: string) =>
  new TypedEvent<EntityState>('ha/entity', entityId)

export const anyEntityUpdate = new TypedEvent<EntityState>('ha/any-entity')

export const entityStateRequest = new TypedEvent<EntityStatePayload>('ha/state')

export const serviceCall = new TypedEvent<ServiceCallPayload>('ha/service')

export const notifications = new TypedEvent<NotificationsPayload>(
  'notifications',
)
