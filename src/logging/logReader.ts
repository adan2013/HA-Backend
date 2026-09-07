import { promises as fs } from 'fs'
import path from 'path'
import { getLogDirectory, LOG_FILE_PREFIX, MAX_LOG_EVENT_BYTES } from './logger'
import { LogEntry, LogLevel } from './types'

export const LOG_ENTRY_LIMIT = 100
const MAX_FILE_TAIL_BYTES = MAX_LOG_EVENT_BYTES * LOG_ENTRY_LIMIT + 1024
const LOG_FILE_PATTERN = new RegExp(
  `^${LOG_FILE_PREFIX}(?:\\.\\d{4}-\\d{2}-\\d{2})?\\.\\d+\\.log$`,
)
const LOG_LEVELS: LogLevel[] = ['info', 'warn', 'error', 'fatal']

const parseLogEntry = (value: unknown): LogEntry | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const entry = value as Partial<LogEntry> & { levelLabel?: unknown }
  const level = typeof entry.level === 'string' ? entry.level : entry.levelLabel
  if (
    typeof entry.time !== 'string' ||
    typeof level !== 'string' ||
    !LOG_LEVELS.includes(level as LogLevel) ||
    typeof entry.scope !== 'string' ||
    typeof entry.message !== 'string'
  ) {
    return undefined
  }
  return {
    time: entry.time,
    level: level as LogLevel,
    scope: entry.scope,
    message: entry.message,
    details: entry.details,
    truncated: entry.truncated,
  }
}

const readFileTail = async (filePath: string): Promise<string[]> => {
  const handle = await fs.open(filePath, 'r')
  try {
    const { size } = await handle.stat()
    const start = Math.max(0, size - MAX_FILE_TAIL_BYTES)
    const buffer = Buffer.alloc(size - start)
    await handle.read(buffer, 0, buffer.length, start)
    let content = buffer.toString('utf8')
    if (start > 0) {
      const firstNewline = content.indexOf('\n')
      content = firstNewline >= 0 ? content.slice(firstNewline + 1) : ''
    }
    return content.split('\n').filter(Boolean)
  } finally {
    await handle.close()
  }
}

export const readRecentLogs = async (
  directory = getLogDirectory(),
): Promise<LogEntry[]> => {
  let names: string[]
  try {
    names = (await fs.readdir(directory)).filter((name) =>
      LOG_FILE_PATTERN.test(name),
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const files = await Promise.all(
    names.map(async (name) => {
      const filePath = path.join(directory, name)
      return { filePath, modifiedAt: (await fs.stat(filePath)).mtimeMs }
    }),
  )
  files.sort((left, right) => right.modifiedAt - left.modifiedAt)

  const entries: LogEntry[] = []
  for (const { filePath } of files) {
    const lines = await readFileTail(filePath)
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        const entry = parseLogEntry(JSON.parse(lines[index]) as unknown)
        if (entry) entries.push(entry)
      } catch {
        // A process crash can leave the final JSONL record incomplete.
      }
      if (entries.length === LOG_ENTRY_LIMIT) return entries.reverse()
    }
  }
  return entries.reverse()
}
