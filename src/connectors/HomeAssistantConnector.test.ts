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
  entityStateRequest,
  homeAssistantEvent,
  homeAssistantResult,
  homeAssistantStatusUpdate,
  homeAssistantSync,
  serviceCall,
} from '../events/events'

describe('HomeAssistantConnector', () => {
  afterEach(() => {
    sentMessages.length = 0
    entityStateRequest.resetListeners()
    homeAssistantStatusUpdate.resetListeners()
    homeAssistantSync.resetListeners()
    serviceCall.resetListeners()
    for (let id = 1; id <= 3; id += 1) {
      homeAssistantEvent(id).resetListeners()
      homeAssistantResult(id).resetListeners()
    }
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
})
