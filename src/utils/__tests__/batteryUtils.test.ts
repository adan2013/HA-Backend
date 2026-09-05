import { EntityState } from '../../connectors/types'
import { parseBatteryReading } from '../batteryUtils'

const entity = (id: string, state: string, friendlyName?: string): EntityState => ({
  id,
  state,
  lastChanged: '',
  lastUpdated: '',
  lastReported: '',
  attributes: { friendly_name: friendlyName },
})

describe('batteryUtils', () => {
  it('should read the level and device name from a battery entity', () => {
    expect(
      parseBatteryReading(
        entity('sensor.kitchen_motion_battery', '73', 'Kitchen motion Battery'),
      ),
    ).toEqual({
      entityId: 'sensor.kitchen_motion_battery',
      name: 'Kitchen motion',
      level: 73,
    })
  })

  it('should preserve a zero battery level', () => {
    expect(
      parseBatteryReading(entity('sensor.remote_battery', '0', 'Remote Battery'))
        ?.level,
    ).toBe(0)
  })

  it('should return an undefined level for an unavailable battery entity', () => {
    expect(
      parseBatteryReading(
        entity('sensor.remote_battery', 'unavailable', 'Remote Battery'),
      )?.level,
    ).toBeUndefined()
  })

  it('should reject legacy battery attributes on other entities', () => {
    const legacy = entity('binary_sensor.remote_action', 'off', 'Remote')
    Object.assign(legacy.attributes, { battery: 15 })

    expect(parseBatteryReading(legacy)).toBeUndefined()
  })
})
