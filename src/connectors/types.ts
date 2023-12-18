export interface SocketMessageInterface {
  type: string
  id?: number
}

export interface EntityAttributeInterface {
  brightness?: number
  color_temp_kelvin?: number
  min_color_temp_kelvin?: number
  max_color_temp_kelvin?: number
  battery?: number
  friendly_name: string
  linkquality?: number
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
  attributes: EntityAttributeInterface
}
