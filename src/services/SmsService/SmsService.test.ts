import axios from 'axios'
import SmsService from './SmsService'
import {
  notifications,
  homeAssistantSync,
  smsGateway,
  webSocketMessage,
} from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entities from '../../configs/entities.config'
import WS_CMD from '../../connectors/wsCommands'
import Timer from '../../Timer'

jest.mock('axios')
jest.mock('../../Timer')

const apiPost = axios.post as jest.Mock
const apiGet = axios.get as jest.Mock
const flushPromises = () => new Promise((resolve) => setImmediate(resolve))

const createService = (apiKey: string, recipients: string) => {
  const service = new SmsService(apiKey, recipients)
  homeAssistantSync.emit({ entitiesCount: 1 })
  return service
}

describe('SmsService', () => {
  beforeEach(() => {
    smsGateway.resetListeners()
    jest.clearAllMocks()
    apiGet.mockResolvedValue({ data: { balance: 21.37 } })
    mockEntity(Entities.inputBoolean.notifications.smsAlerts, 'on')
  })

  it('uses the Sendly Link endpoint, payload, and response format', async () => {
    apiPost.mockResolvedValue({ data: { message_id: 'a906cff7719bd889' } })
    const service = createService('test-token', '+48111111111,+48222222222')
    smsGateway.emit({ source: 'waterLeak', text: 'Water leak detected' })
    await flushPromises()

    expect(apiPost).toHaveBeenCalledTimes(2)
    expect(apiPost).toHaveBeenCalledWith(
      'https://api.sendly.link/api/sms',
      {
        to: '48111111111',
        body: 'Water leak detected',
      },
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      }),
    )
    expect(service.getServiceStatus().status).toEqual(
      expect.objectContaining({ color: 'green' }),
    )
  })

  it('does not send an old alarm after the helper is enabled', async () => {
    const service = createService('sk_test_key', '+48111111111')
    emitStateUpdate(Entities.inputBoolean.notifications.smsAlerts, 'off')
    smsGateway.emit({ source: 'mainDoorOpen', text: 'Door open' })
    emitStateUpdate(Entities.inputBoolean.notifications.smsAlerts, 'on')
    await flushPromises()

    expect(apiPost).not.toHaveBeenCalled()
    expect(service.getServiceStatus().status.color).toBe('green')
  })

  it('allows the test command despite a disabled helper', async () => {
    apiPost.mockResolvedValue({ data: { message_id: 'a906cff7719bd889' } })
    createService('sk_test_key', '+48111111111')
    emitStateUpdate(Entities.inputBoolean.notifications.smsAlerts, 'off')
    const sendResponse = jest.fn()
    webSocketMessage(WS_CMD.incoming.TEST_SMS).emit({
      message: {},
      sendResponse,
    })
    await flushPromises()

    expect(apiPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: 'This is a test SMS.' }),
      expect.any(Object),
    )
    expect(sendResponse).not.toHaveBeenCalled()
  })

  it('includes safe validation field names in the failure status', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    apiPost.mockRejectedValue({
      response: {
        status: 422,
        data: {
          errors: {
            from: ['Invalid sender: SENDLY'],
          },
        },
      },
    })
    const service = createService('test-token', '+48111111111')
    webSocketMessage(WS_CMD.incoming.TEST_SMS).emit({
      message: {},
      sendResponse: jest.fn(),
    })
    await flushPromises()

    const status = service.getServiceStatus().status
    expect(status.color).toBe('red')
    expect(status.message).toContain('Sendly HTTP 422')
    expect(status.message).toContain('from')
    expect(status.message).not.toContain('SENDLY')
  })

  it('reports a partial failure and clears it after a successful series', async () => {
    apiPost
      .mockResolvedValueOnce({ data: { message_id: 'a906cff7719bd889' } })
      .mockRejectedValueOnce(new Error('Sendly unavailable'))
      .mockResolvedValue({ data: { message_id: 'b906cff7719bd889' } })
    const notification = jest.fn()
    notifications.on(notification)
    const service = createService('sk_test_key', '+48111111111,+48222222222')

    smsGateway.emit({ source: 'waterLeak', text: 'Leak' })
    await flushPromises()
    expect(apiPost).toHaveBeenCalledTimes(2)
    expect(service.getServiceStatus().status.color).toBe('red')
    expect(notification).toHaveBeenCalledWith({
      id: 'smsFailure',
      enabled: true,
      payload: {
        source: 'waterLeak',
        errors: ['Sendly unavailable'],
        delivery: { sent: 1, total: 2 },
      },
    })

    smsGateway.emit({ source: 'mainDoorOpen', text: 'Door' })
    await flushPromises()
    expect(service.getServiceStatus().status.color).toBe('green')
    expect(notification).toHaveBeenCalledWith({
      id: 'smsFailure',
      enabled: false,
    })
  })

  it('stays red without configuration and does not call Sendly', async () => {
    const notification = jest.fn()
    notifications.on(notification)
    const service = createService('', '')
    expect(service.getServiceStatus().status.color).toBe('red')
    smsGateway.emit({ source: 'waterLeak', text: 'Leak' })
    await flushPromises()
    expect(apiPost).not.toHaveBeenCalled()
    expect(apiGet).not.toHaveBeenCalled()
    expect(notification).toHaveBeenCalledWith({
      id: 'smsFailure',
      enabled: true,
      payload: { source: 'waterLeak', errors: ['SENDLY_API_KEY is missing'] },
    })
  })

  it('fetches balance at startup without HA or recipients and schedules 04:00', async () => {
    const service = new SmsService('balance-token', '')
    await flushPromises()
    expect(apiGet).toHaveBeenCalledWith('https://api.sendly.link/api/balance', {
      headers: { Authorization: 'Bearer balance-token' },
      timeout: 10000,
    })
    expect(service.getServiceStatus().helpers['value/balance']).toMatchObject({
      value: 21.37,
      error: null,
    })
    expect(Timer.onTime).toHaveBeenCalledWith(4, 0, expect.any(Function))
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('retains balance after a failed nightly fetch and recovers on the next day', async () => {
    const service = new SmsService('balance-token', '')
    await flushPromises()
    const original = service.getServiceStatus().helpers['value/balance']
    const nightly = (Timer.onTime as jest.Mock).mock.calls[0][2]
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    apiGet.mockRejectedValueOnce({
      response: { status: 403, data: { token: 'balance-token' } },
    })
    nightly()
    await flushPromises()
    expect(service.getServiceStatus().helpers['value/balance']).toMatchObject({
      ...original,
      message: 'Sendly balance request failed (HTTP 403)',
      error: 'Sendly balance request failed (HTTP 403)',
      color: 'red',
    })
    expect(JSON.stringify(service.getServiceStatus())).not.toContain(
      'balance-token',
    )
    apiGet.mockResolvedValueOnce({ data: { balance: 0 } })
    nightly()
    await flushPromises()
    expect(service.getServiceStatus().helpers['value/balance']).toMatchObject({
      value: 0,
      error: null,
      color: 'green',
    })
  })

  it.each(['21.37', '0.05', '0', '-2.50'])(
    'normalizes decimal balance %s',
    async (balance) => {
      apiGet.mockResolvedValueOnce({ data: { balance } })
      const service = new SmsService('balance-token', '')
      await flushPromises()
      expect(service.getServiceStatus().helpers['value/balance']).toMatchObject(
        {
          value: Number(balance),
          error: null,
        },
      )
    },
  )

  it.each([null, '', ' ', '21 PLN', '0x10', {}, Number.NaN, Infinity])(
    'rejects an invalid upstream balance (%s) instead of displaying zero',
    async (balance) => {
      apiGet.mockResolvedValueOnce({ data: { balance } })
      const service = new SmsService('balance-token', '')
      await flushPromises()
      expect(service.getServiceStatus().helpers['value/balance']).toMatchObject(
        {
          value: null,
          error: 'Invalid Sendly balance response',
        },
      )
    },
  )
})
