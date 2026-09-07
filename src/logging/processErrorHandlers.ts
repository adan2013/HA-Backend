import { createLogger, flushLogger } from './logger'

const logger = createLogger('Process')
const EXIT_TIMEOUT_MS = 2000

export const registerProcessErrorHandlers = () => {
  let terminating = false

  const terminate = (source: string, error: unknown) => {
    if (terminating) return
    terminating = true
    logger.fatal(`Unhandled ${source}`, { error })

    const exit = () => process.exit(1)
    const timeout = setTimeout(exit, EXIT_TIMEOUT_MS)
    flushLogger(() => {
      clearTimeout(timeout)
      exit()
    })
  }

  process.on('warning', (warning) => {
    logger.warn('Node.js process warning', { warning })
  })
  process.once('uncaughtException', (error) => {
    terminate('exception', error)
  })
  process.once('unhandledRejection', (reason) => {
    terminate('promise rejection', reason)
  })
}
