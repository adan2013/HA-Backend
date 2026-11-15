import { getMqttLastReport, MqttDebugInfo } from './mqttActivity'

const entityId = 'binary_sensor.leak'
const stateTopic = 'zigbee2mqtt/leak'
const message = (
  time: string,
  payload = '{"water_leak":false}',
  retain = false,
) => ({
  topic: stateTopic,
  time,
  payload,
  retain,
})
const info = (
  messages: MqttDebugInfo['entities'][number]['subscriptions'][number]['messages'],
): MqttDebugInfo => ({
  entities: [
    {
      entity_id: entityId,
      discovery_data: { payload: { state_topic: stateTopic } },
      subscriptions: [
        {
          topic: 'zigbee2mqtt/bridge/state',
          messages: [
            {
              topic: 'zigbee2mqtt/bridge/state',
              time: '2026-11-13T12:00:00Z',
              payload: '{"state":"online"}',
              retain: false,
            },
          ],
        },
        { topic: stateTopic, messages },
      ],
    },
  ],
})

describe('MQTT device activity', () => {
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-11-13T12:00:00Z')),
  )
  afterEach(() => jest.useRealTimers())

  it('uses the latest device message even when the leak value never changes', () => {
    expect(
      getMqttLastReport(
        info([
          message('2026-11-12T20:10:55Z'),
          message('2026-11-13T08:52:55Z'),
        ]),
        entityId,
      ),
    ).toBe('2026-11-13T08:52:55.000Z')
  })

  it('does not count bridge traffic or retained replay as a device report', () => {
    expect(
      getMqttLastReport(
        info([
          message('2026-11-12T20:10:55Z'),
          message('2026-11-13T12:00:00Z', '{"water_leak":false}', true),
        ]),
        entityId,
      ),
    ).toBe('2026-11-12T20:10:55.000Z')
    expect(getMqttLastReport(info([]), entityId)).toBeUndefined()
  })

  it.each(['2026-11-12T20:10:55Z', Date.parse('2026-11-12T20:10:55Z')])(
    'prefers last_seen=%s to the time a cached state was published',
    (last_seen) => {
      expect(
        getMqttLastReport(
          info([
            message(
              '2026-11-13T12:00:00Z',
              JSON.stringify({ last_seen }),
              true,
            ),
          ]),
          entityId,
        ),
      ).toBe('2026-11-12T20:10:55.000Z')
    },
  )

  it('ignores malformed and future timestamps instead of inventing recent activity', () => {
    expect(
      getMqttLastReport(
        info([
          message('invalid'),
          message('2026-11-14T12:00:00Z'),
          message('2026-11-13T12:00:00Z', '{"last_seen":"invalid"}'),
        ]),
        entityId,
      ),
    ).toBeUndefined()
  })

  it('supports plain text state payloads', () => {
    expect(
      getMqttLastReport(
        info([message('2026-11-13T11:00:00Z', 'OFF')]),
        entityId,
      ),
    ).toBe('2026-11-13T11:00:00.000Z')
  })

  it('reports missing discovery data instead of using unrelated device traffic', () => {
    expect(() => getMqttLastReport({ entities: [] }, entityId)).toThrow(
      'MQTT state topic missing',
    )
  })
})
