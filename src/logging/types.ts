export type LogLevel = 'info' | 'warn' | 'error' | 'fatal'

export type LogDetails = Record<string, unknown>

export type LogEntry = {
  time: string
  level: LogLevel
  scope: string
  message: string
  details?: unknown
  truncated?: boolean
}

export type AppLogger = {
  info: (message: string, details?: LogDetails) => void
  warn: (message: string, details?: LogDetails) => void
  error: (message: string, details?: LogDetails) => void
  fatal: (message: string, details?: LogDetails) => void
}
