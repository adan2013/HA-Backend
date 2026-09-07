import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { readRecentLogs, LOG_ENTRY_LIMIT } from './logReader'
import { LogEntry } from './types'

const entry = (index: number): LogEntry => ({
  time: new Date(index * 1000).toISOString(),
  level: index % 2 === 0 ? 'info' : 'error',
  scope: 'Test',
  message: `event-${index}`,
})

describe('readRecentLogs', () => {
  let directory: string

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ha-logs-'))
  })

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true })
  })

  it('returns the latest 100 valid events in chronological order', async () => {
    const entries = Array.from({ length: 120 }, (_, index) => entry(index))
    await fs.writeFile(
      path.join(directory, 'backend.2026-09-07.0.log'),
      `${entries.map((item) => JSON.stringify(item)).join('\n')}\n`,
    )

    const result = await readRecentLogs(directory)

    expect(result).toHaveLength(LOG_ENTRY_LIMIT)
    expect(result[0].message).toBe('event-20')
    expect(result.at(-1)?.message).toBe('event-119')
  })

  it('reads across rotated files and skips malformed lines', async () => {
    const olderPath = path.join(directory, 'backend.2026-09-06.0.log')
    const newerPath = path.join(directory, 'backend.2026-09-07.0.log')
    await fs.writeFile(olderPath, `${JSON.stringify(entry(1))}\n`)
    await fs.writeFile(
      newerPath,
      `not-json\n${JSON.stringify(entry(2))}\n{"incomplete":`,
    )
    await fs.utimes(olderPath, new Date(1000), new Date(1000))
    await fs.utimes(newerPath, new Date(2000), new Date(2000))

    const result = await readRecentLogs(directory)

    expect(result.map((item) => item.message)).toEqual(['event-1', 'event-2'])
  })

  it('returns an empty collection when the log directory does not exist', async () => {
    await fs.rm(directory, { recursive: true, force: true })

    await expect(readRecentLogs(directory)).resolves.toEqual([])
  })
})
