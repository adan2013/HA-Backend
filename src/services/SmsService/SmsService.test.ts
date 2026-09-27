import axios from 'axios'
import SmsService from './SmsService'
import {
  notifications,
  smsGateway,
  webSocketMessage,
} from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entities from '../../configs/entities.config'
import WS_CMD from '../../connectors/wsCommands'

jest.mock('axios')

const apiPost = axios.post as jest.Mock
const flushPromises = () => new Promise((resolve) => setImmediate(resolve))

describe('SmsService', () => {
  beforeEach(() => {
    smsGateway.resetListeners()
    jest.clearAllMocks()
    mockEntity(Entities.inputBoolean.notifications.smsAlerts, 'on')
  })

  it('uses the Sendly Link endpoint, payload, and response format', async () => {
    apiPost.mockResolvedValue({ data: { message_id: 'a906cff7719bd889' } })
    const service = new SmsService('test-token', '+48111111111,+48222222222')
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
    const service = new SmsService('sk_test_key', '+48111111111')
    emitStateUpdate(Entities.inputBoolean.notifications.smsAlerts, 'off')
    smsGateway.emit({ source: 'mainDoorOpen', text: 'Door open' })
    emitStateUpdate(Entities.inputBoolean.notifications.smsAlerts, 'on')
    await flushPromises()

    expect(apiPost).not.toHaveBeenCalled()
    expect(service.getServiceStatus().status.color).toBe('green')
  })

  it('allows the test command despite a disabled helper', async () => {
    apiPost.mockResolvedValue({ data: { message_id: 'a906cff7719bd889' } })
    new SmsService('sk_test_key', '+48111111111')
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
    const service = new SmsService('test-token', '+48111111111')
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
    const service = new SmsService('sk_test_key', '+48111111111,+48222222222')

    smsGateway.emit({ source: 'waterLeak', text: 'Leak' })
    await flushPromises()
    expect(apiPost).toHaveBeenCalledTimes(2)
    expect(service.getServiceStatus().status.color).toBe('red')
    expect(notification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'smsFailure', enabled: true }),
    )

    smsGateway.emit({ source: 'mainDoorOpen', text: 'Door' })
    await flushPromises()
    expect(service.getServiceStatus().status.color).toBe('green')
    expect(notification).toHaveBeenCalledWith({
      id: 'smsFailure',
      enabled: false,
    })
  })

  it('stays red without configuration and does not call Sendly', async () => {
    const service = new SmsService('', '')
    expect(service.getServiceStatus().status.color).toBe('red')
    smsGateway.emit({ source: 'waterLeak', text: 'Leak' })
    await flushPromises()
    expect(apiPost).not.toHaveBeenCalled()
  })
})
