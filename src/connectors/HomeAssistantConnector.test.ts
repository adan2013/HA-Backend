const sentMessages: string[] = []

class MockWebSocket {
  static readonly OPEN = 1
  static instance: MockWebSocket

  readyState = MockWebSocket.OPEN
  onopen: (() => void) | undefined
  onmessage: ((event: { data: string }) => void) | undefined
  onclose: (() => void) | undefined
  onerror: ((error: unknown) => void) | undefined

  constructor() {
    MockWebSocket.instance = this
  }

  send(message: string) {
    sentMessages.push(message)
  }
}

jest.mock('ws', () => ({
  WebSocket: MockWebSocket,
}))

import HomeAssistantConnector from './HomeAssistantConnector'
import {
  entityReported,
  entityStateRequest,
  homeAssistantEvent,
  homeAssistantResult,
  homeAssistantStatusUpdate,
  homeAssistantSync,
  serviceCall,
} from '../events/events'

describe('HomeAssistantConnector', () => {
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-11-13T12:00:00Z')),
  )
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    sentMessages.length = 0
    entityStateRequest.resetListeners()
    entityReported.resetListeners()
    homeAssistantStatusUpdate.resetListeners()
    homeAssistantSync.resetListeners()
    serviceCall.resetListeners()
    for (let id = 1; id <= 3; id += 1) {
      homeAssistantEvent(id).resetListeners()
      homeAssistantResult(id).resetListeners()
    }
  })

  const receive = (message: object) =>
    MockWebSocket.instance.onmessage?.({ data: JSON.stringify(message) })
  const connect = () => {
    const connector = new HomeAssistantConnector('home-assistant:8123', 'token')
    receive({ type: 'auth_ok' })
    receive({ id: 1, type: 'result', success: true, result: [] })
    return connector
  }

  it('reads MQTT receipt time via the registry even if the HA entity never changes', async () => {
    const connector = connect()
    const report = connector.getMqttLastReport('binary_sensor.leak')
    expect(JSON.parse(sentMessages[sentMessages.length - 1])).toMatchObject({
      type: 'config/entity_registry/get',
      entity_id: 'binary_sensor.leak',
    })
    receive({
      id: 3,
      type: 'result',
      success: true,
      result: { platform: 'mqtt', device_id: 'leak-device' },
    })
    await Promise.resolve()
    expect(JSON.parse(sentMessages[sentMessages.length - 1])).toMatchObject({
      type: 'mqtt/device/debug_info',
      device_id: 'leak-device',
    })
    receive({
      id: 4,
      type: 'result',
      success: true,
      result: {
        entities: [
          {
            entity_id: 'binary_sensor.leak',
            discovery_data: { payload: { state_topic: 'zigbee2mqtt/leak' } },
            subscriptions: [
              {
                topic: 'zigbee2mqtt/leak',
                messages: [
                  {
                    topic: 'zigbee2mqtt/leak',
                    payload: '{"water_leak":false}',
                    time: '2026-11-13T08:52:55Z',
                    retain: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    await expect(report).resolves.toBe('2026-11-13T08:52:55.000Z')
  })

  it('rejects a failed MQTT read rather than returning a fresh timestamp', async () => {
    const connector = connect()
    const report = connector.getMqttLastReport('binary_sensor.leak')
    receive({
      id: 3,
      type: 'result',
      success: false,
      error: { message: 'Entity not found' },
    })
    await expect(report).rejects.toThrow('Entity not found')
  })

  it('times out unanswered reads so monitoring can retry', async () => {
    const connector = connect()
    const report = connector.getMqttLastReport('binary_sensor.leak')
    const assertion = expect(report).rejects.toThrow('timed out')
    jest.advanceTimersByTime(10000)
    await assertion
    const retry = connector.getMqttLastReport('binary_sensor.leak')
    receive({
      id: 3,
      type: 'result',
      success: true,
      result: { platform: 'mqtt', device_id: 'old-response' },
    })
    receive({
      id: 4,
      type: 'result',
      success: false,
      error: { message: 'Retry rejected' },
    })
    await expect(retry).rejects.toThrow('Retry rejected')
  })

  it('cancels outstanding reads on disconnect and can read after reconnecting', async () => {
    const connector = connect()
    const report = connector.getMqttLastReport('binary_sensor.leak')
    MockWebSocket.instance.onclose?.()
    await expect(report).rejects.toThrow('disconnected')
    await expect(
      connector.getMqttLastReport('binary_sensor.leak'),
    ).rejects.toThrow('not connected')
    jest.advanceTimersByTime(10000)
    receive({ type: 'auth_ok' })
    receive({ id: 4, type: 'result', success: true, result: [] })
    const retry = connector.getMqttLastReport('binary_sensor.leak')
    receive({
      id: 6,
      type: 'result',
      success: false,
      error: { message: 'New request received' },
    })
    await expect(retry).rejects.toThrow('New request received')
  })

  it('should allow service calls from the sync listener', async () => {
    const connector = new HomeAssistantConnector('home-assistant:8123', 'token')
    let stateDuringSync: string | undefined
    let serviceCallResult: Promise<unknown> | undefined

    homeAssistantSync.once(() => {
      stateDuringSync = connector.connectionState
      serviceCallResult = connector.callService(
        'light.notification',
        'light',
        'turn_off',
      )
      void serviceCallResult.catch(() => undefined)
    })

    MockWebSocket.instance.onopen?.()
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({ type: 'auth_ok' }),
    })
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 1,
        type: 'result',
        success: true,
        result: [],
      }),
    })

    expect(stateDuringSync).toBe('synced')
    expect(JSON.parse(sentMessages[2])).toMatchObject({
      id: 3,
      type: 'call_service',
      domain: 'light',
      service: 'turn_off',
    })

    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 3,
        type: 'result',
        success: true,
        result: null,
      }),
    })
    await expect(serviceCallResult).resolves.toBeNull()
  })

  it('should expose and refresh dedicated battery entities without mutating siblings', () => {
    const connector = new HomeAssistantConnector('home-assistant:8123', 'token')
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({ type: 'auth_ok' }),
    })
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 1,
        type: 'result',
        success: true,
        result: [
          {
            entity_id: 'binary_sensor.water_sensor_water_leak',
            state: 'off',
            last_changed: '',
            last_updated: '',
            last_reported: '',
            attributes: { friendly_name: 'Water sensor Water leak' },
          },
          {
            entity_id: 'sensor.water_sensor_battery',
            state: '80',
            last_changed: '',
            last_updated: '',
            last_reported: '',
            attributes: { friendly_name: 'Water sensor Battery' },
          },
        ],
      }),
    })

    expect(connector.getBatteryEntities()).toEqual([
      expect.objectContaining({
        id: 'sensor.water_sensor_battery',
        state: '80',
      }),
    ])
    expect(
      connector.getEntityState('binary_sensor.water_sensor_water_leak')
        ?.attributes,
    ).toEqual({ friendly_name: 'Water sensor Water leak' })

    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 2,
        type: 'event',
        event: {
          data: {
            new_state: {
              entity_id: 'sensor.water_sensor_battery',
              state: '25',
              last_changed: '',
              last_updated: '',
              last_reported: '',
              attributes: { friendly_name: 'Water sensor Battery' },
            },
          },
        },
      }),
    })

    expect(connector.getBatteryEntities()).toEqual([
      expect.objectContaining({
        id: 'sensor.water_sensor_battery',
        state: '25',
      }),
    ])
  })

  it('should emit activity when lastReported changes without a state change', () => {
    jest.useFakeTimers()
    const reportListener = jest.fn()
    entityReported.on(reportListener)
    new HomeAssistantConnector('home-assistant:8123', 'token')
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({ type: 'auth_ok' }),
    })
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 1,
        type: 'result',
        success: true,
        result: [
          {
            entity_id: 'sensor.temperature',
            state: '21.5',
            last_changed: '2026-09-05T10:00:00Z',
            last_updated: '2026-09-05T10:00:00Z',
            last_reported: '2026-09-05T10:00:00Z',
            attributes: { friendly_name: 'Temperature' },
          },
        ],
      }),
    })

    jest.advanceTimersByTime(60 * 60 * 1000)
    MockWebSocket.instance.onmessage?.({
      data: JSON.stringify({
        id: 3,
        type: 'result',
        success: true,
        result: [
          {
            entity_id: 'sensor.temperature',
            state: '21.5',
            last_changed: '2026-09-05T10:00:00Z',
            last_updated: '2026-09-05T10:00:00Z',
            last_reported: '2026-09-05T11:00:00Z',
            attributes: { friendly_name: 'Temperature' },
          },
        ],
      }),
    })

    expect(reportListener).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sensor.temperature',
        lastReported: '2026-09-05T11:00:00Z',
      }),
    )
    jest.useRealTimers()
  })
})
