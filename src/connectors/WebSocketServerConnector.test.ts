import { WebSocket } from 'ws'
import { readRecentLogs } from '../logging/logReader'
import WebSocketServerConnector from './WebSocketServerConnector'

jest.mock('../logging/logReader', () => ({
  readRecentLogs: jest.fn(),
}))

const mockedReadRecentLogs = readRecentLogs as jest.MockedFunction<
  typeof readRecentLogs
>

type TestableConnector = {
  getBackendLogs: (
    ws: WebSocket,
    message: { requestId?: string },
  ) => Promise<void>
}

describe('WebSocketServerConnector backend logs protocol', () => {
  const getConnector = () =>
    Object.create(WebSocketServerConnector.prototype) as TestableConnector

  const getSocket = () =>
    ({
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    } as unknown as WebSocket)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the recent logs for a valid request', async () => {
    const entries = [
      {
        time: '2026-09-07T10:00:00.000Z',
        level: 'info' as const,
        scope: 'Application',
        message: 'Backend starting',
      },
    ]
    mockedReadRecentLogs.mockResolvedValue(entries)
    const socket = getSocket()

    await getConnector().getBackendLogs(socket, { requestId: '42' })

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'backendLogsResult',
        requestId: '42',
        data: entries,
      }),
    )
  })

  it('rejects a request without an id', async () => {
    const socket = getSocket()

    await getConnector().getBackendLogs(socket, {})

    expect(mockedReadRecentLogs).not.toHaveBeenCalled()
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'commandResult',
        success: false,
        error: 'Invalid backend logs request',
      }),
    )
  })
})
