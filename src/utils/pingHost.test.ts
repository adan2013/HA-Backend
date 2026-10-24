import { execFile } from 'child_process'
import { pingHost } from './pingHost'

jest.mock('child_process', () => ({ execFile: jest.fn() }))

const execMock = jest.mocked(execFile)
const originalPlatform = process.platform

const completePing = (error: Error | null) => {
  const call = execMock.mock.calls[0]
  const callback = call[call.length - 1] as (error: Error | null) => void
  callback(error)
}

describe('pingHost', () => {
  beforeEach(() => execMock.mockReset())
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it.each([
    ['linux', '2', 1],
    ['darwin', '2000', 2],
  ] as const)(
    'should probe and recognize no replies on %s',
    async (platform, timeout, noReplyCode) => {
      Object.defineProperty(process, 'platform', { value: platform })
      const result = pingHost('192.168.1.5')
      expect(execMock).toHaveBeenCalledWith(
        'ping',
        ['-n', '-c', '3', '-W', timeout, '192.168.1.5'],
        { timeout: 10000, maxBuffer: 16 * 1024 },
        expect.any(Function),
      )
      completePing(
        Object.assign(new Error('No replies'), { code: noReplyCode }),
      )
      await expect(result).resolves.toBe(false)
    },
  )

  it('should recognize a reachable host', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    const result = pingHost('192.168.1.5')
    completePing(null)
    await expect(result).resolves.toBe(true)
  })

  it.each(['ENOENT', 'EACCES', 2, null])(
    'should reject local execution failures (%s)',
    async (code) => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      const result = pingHost('192.168.1.5')
      const error = Object.assign(new Error('Probe failed'), { code })
      completePing(error)
      await expect(result).rejects.toBe(error)
    },
  )

  it.each([
    '',
    'dash-node.local',
    '192.168.1.999',
    '-c 100',
    '192.168.1.5; echo bad',
  ])(
    'should reject an invalid IP before starting ping (%s)',
    async (ipAddress) => {
      await expect(pingHost(ipAddress)).rejects.toThrow('valid IPv4 address')
      expect(execMock).not.toHaveBeenCalled()
    },
  )

  it('should reject unsupported platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    await expect(pingHost('192.168.1.5')).rejects.toThrow('Linux or macOS')
    expect(execMock).not.toHaveBeenCalled()
  })
})
