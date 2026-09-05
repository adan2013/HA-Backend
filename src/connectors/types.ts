export interface SocketMessageInterface {
  type: string
  id?: number
}

export interface EntityAttributeInterface {
  brightness?: number
  color_temp_kelvin?: number
  min_color_temp_kelvin?: number
  max_color_temp_kelvin?: number
  friendly_name?: string
}

export type MessageOptions = {
  includeId: boolean
  resultCallback?: (result: any) => void
  eventCallback?: (event: any) => void
}

export type EntityState = {
  id: string
  state: string
  lastChanged: string
  lastUpdated: string
  lastReported: string
  attributes: EntityAttributeInterface
}

export type HomeAssistantConnectionState =
  | 'synced'
  | 'authorized'
  | 'connected'
  | 'disconnected'
  | 'authError'

export type SensorHistoryItem = {
  id: number
  time: string
  value: number
}
