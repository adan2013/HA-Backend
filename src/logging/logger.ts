import path from 'path'
import pino, { Logger } from 'pino'
import { AppLogger, LogDetails, LogLevel } from './types'

export const MAX_LOG_EVENT_BYTES = 16 * 1024
export const LOG_FILE_PREFIX = 'backend'

const logDirectory =
  process.env['LOG_DIR'] ||
  (process.env['ENV'] === 'production' ? '/opt/app/logs' : 'logs')

const transport =
  process.env['ENV'] === 'test'
    ? undefined
    : pino.transport({
        targets: [
          {
            target: require.resolve('pino/file'),
            options: { destination: 1 },
          },
          {
            target: require.resolve('pino-roll'),
            options: {
              file: path.join(logDirectory, `${LOG_FILE_PREFIX}.log`),
              frequency: 'daily',
              dateFormat: 'yyyy-MM-dd',
              mkdir: true,
              limit: {
                count: 6,
                removeOtherLogFiles: true,
              },
            },
          },
        ],
      })

let isTransportReady = !transport
transport?.once('ready', () => {
  isTransportReady = true
})
transport?.on('error', (error: unknown) => {
  process.stderr.write(`Logger transport failed: ${String(error)}\n`)
})

const baseLogger = pino(
  {
    enabled: process.env['ENV'] !== 'test',
    level: 'info',
    base: undefined,
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label, number) => ({ level: number, levelLabel: label }),
    },
  },
  transport,
)

const serializeDetails = (details: LogDetails): unknown => {
  const seen = new WeakSet<object>()
  const serialized = JSON.stringify(details, (_key, value: unknown) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    }
    if (typeof value === 'bigint') return value.toString()
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  })
  return serialized ? JSON.parse(serialized) : undefined
}

const truncateUtf8 = (value: string, maxBytes: number): string => {
  if (Buffer.byteLength(value) <= maxBytes) return value
  let end = Math.min(value.length, maxBytes)
  while (end > 0 && Buffer.byteLength(`${value.slice(0, end)}…`) > maxBytes) {
    end -= 1
  }
  return `${value.slice(0, end)}…`
}

const fitsEventLimit = (
  level: LogLevel,
  scope: string,
  message: string,
  details: unknown,
): boolean =>
  Buffer.byteLength(
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      levelLabel: level,
      scope,
      message,
      details,
      truncated: true,
    }),
  ) <= MAX_LOG_EVENT_BYTES

export const prepareLogEvent = (
  level: LogLevel,
  scope: string,
  message: string,
  details?: LogDetails,
): { message: string; details?: unknown; truncated?: boolean } => {
  const fittedMessage = truncateUtf8(message, 4096)
  const normalizedDetails = details ? serializeDetails(details) : undefined
  if (fitsEventLimit(level, scope, fittedMessage, normalizedDetails)) {
    return {
      message: fittedMessage,
      details: normalizedDetails,
      truncated: fittedMessage !== message || undefined,
    }
  }

  const serializedDetails = JSON.stringify(normalizedDetails)
  let low = 0
  let high = serializedDetails.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const candidate = `${serializedDetails.slice(0, middle)}…`
    if (fitsEventLimit(level, scope, fittedMessage, candidate)) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return {
    message: fittedMessage,
    details: `${serializedDetails.slice(0, low)}…`,
    truncated: true,
  }
}

const write = (
  logger: Logger,
  level: LogLevel,
  scope: string,
  message: string,
  details?: LogDetails,
) => {
  const fitted = prepareLogEvent(level, scope, message, details)
  const { message: fittedMessage, ...payload } = fitted
  logger[level]({ scope, ...payload }, fittedMessage)
}

export const createLogger = (scope: string): AppLogger => ({
  info: (message, details) =>
    write(baseLogger, 'info', scope, message, details),
  warn: (message, details) =>
    write(baseLogger, 'warn', scope, message, details),
  error: (message, details) =>
    write(baseLogger, 'error', scope, message, details),
  fatal: (message, details) =>
    write(baseLogger, 'fatal', scope, message, details),
})

export const flushLogger = (callback: () => void) => {
  if (isTransportReady) {
    baseLogger.flush(callback)
  } else {
    transport?.once('ready', () => baseLogger.flush(callback))
  }
}

export const flushLoggerAsync = () =>
  new Promise<void>((resolve) => flushLogger(resolve))

export const getLogDirectory = () => logDirectory
