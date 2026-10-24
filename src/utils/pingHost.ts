import { execFile } from 'child_process'
import { isIPv4 } from 'net'

// Resolve false only for a completed probe with no replies. Local failures
// (missing executable, permissions, invalid configuration) reject instead.
export const pingHost = (ipAddress: string): Promise<boolean> => {
  if (!isIPv4(ipAddress)) {
    return Promise.reject(new Error('Ping requires a valid IPv4 address'))
  }
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    return Promise.reject(new Error('Ping monitoring requires Linux or macOS'))
  }
  const isMac = process.platform === 'darwin'
  return new Promise((resolve, reject) => {
    execFile(
      'ping',
      ['-n', '-c', '3', '-W', isMac ? '2000' : '2', ipAddress],
      { timeout: 10000, maxBuffer: 16 * 1024 },
      (error) => {
        if (!error) resolve(true)
        else if (error.code === (isMac ? 2 : 1)) resolve(false)
        else reject(error)
      },
    )
  })
}
