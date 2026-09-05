import { EntityState } from '../connectors/types'

const BATTERY_ENTITY_PATTERN = /^sensor\.(.+)_battery$/

export type BatteryReading = {
  entityId: string
  name: string
  level: number | undefined
}

export const parseBatteryReading = (
  entity: EntityState,
): BatteryReading | undefined => {
  const match = entity.id.match(BATTERY_ENTITY_PATTERN)
  if (!match) return undefined

  const numericState =
    entity.state.trim() === '' ? Number.NaN : Number(entity.state)
  const friendlyName = entity.attributes.friendly_name
  const deviceName = friendlyName?.replace(/\s+battery$/i, '').trim()

  return {
    entityId: entity.id,
    name: deviceName || match[1],
    level: Number.isFinite(numericState) ? numericState : undefined,
  }
}
