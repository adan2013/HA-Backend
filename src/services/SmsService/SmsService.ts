import axios from 'axios'
import Service from '../Service'
import Entity from '../../entities/Entity'
import Entities from '../../configs/entities.config'
import {
  notifications,
  smsGateway,
  webSocketMessage,
} from '../../events/events'
import WS_CMD from '../../connectors/wsCommands'
import { createLogger } from '../../logging/logger'

const logger = createLogger('SmsService')
const SENDLY_MESSAGES_URL = 'https://api.sendly.link/api/sms'
const TEST_MESSAGE = 'This is a test SMS.'
const SENDLY_NUMBER = /^[0-9]{9,11}$/

type SendlyMessage = {
  message_id: string
}

type SendResult = {
  sent: number
  failed: number
  total: number
  error?: string
}

class SmsService extends Service {
  private static maskNumber(number: string) {
    return `***${number.slice(-4)}`
  }

  private static describeError(error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) return error.message

      const validationErrors = error.response.data?.errors
      const rejectedFields =
        validationErrors && typeof validationErrors === 'object'
          ? ['from', 'to', 'body'].filter((field) => field in validationErrors)
          : []
      const fields = rejectedFields.length
        ? `; invalid fields: ${rejectedFields.join(', ')}`
        : ''
      return `Sendly HTTP ${error.response.status}${fields}`
    }
    return error instanceof Error ? error.message : 'Unknown Sendly error'
  }

  private readonly alertsToggle = Entity.toggle(
    Entities.inputBoolean.notifications.smsAlerts,
  )
  private readonly apiKey: string
  private readonly recipients: string[]
  private readonly configError: string | null
  private lastOutcome = 'No SMS sent yet'
  private lastSendFailed = false
  private sendQueue: Promise<SendResult> = Promise.resolve({
    sent: 0,
    failed: 0,
    total: 0,
  })

  constructor(
    apiKey = process.env['SENDLY_API_KEY'],
    recipients = process.env['SMS_RECIPIENTS'],
  ) {
    super('sms')
    this.apiKey = apiKey?.trim() || ''
    this.recipients = Array.from(
      new Set(
        (recipients || '')
          .split(',')
          .map((number) => number.trim())
          .map((number) => number.replace(/^\+/, ''))
          .filter(Boolean),
      ),
    )
    if (!this.apiKey) {
      this.configError = 'SENDLY_API_KEY is missing'
    } else if (this.recipients.length === 0) {
      this.configError = 'SMS_RECIPIENTS is empty'
    } else if (this.recipients.some((number) => !SENDLY_NUMBER.test(number))) {
      this.configError = 'SMS_RECIPIENTS must contain 9-11 digit numbers'
    } else {
      this.configError = null
    }

    if (this.configError) {
      logger.error('SMS configuration invalid', { reason: this.configError })
    }
    this.updateStatus()
    this.alertsToggle.onChange(() => this.updateStatus())
    smsGateway.on(({ source, text }) => {
      if (!this.alertsToggle.isOn) {
        logger.info('Automatic SMS skipped because alerts are disabled', {
          source,
        })
        return
      }
      void this.enqueueSend(text, source)
    })
    webSocketMessage(WS_CMD.incoming.TEST_SMS).on(() => {
      void this.enqueueSend(TEST_MESSAGE, 'test')
    })
  }

  private updateStatus() {
    if (this.configError) {
      this.setServiceStatus(
        `Configuration error: ${this.configError}; ${this.lastOutcome}`,
        'red',
      )
      return
    }
    this.setServiceStatus(
      `Recipients: ${this.recipients.length}; Alerts: ${
        this.alertsToggle.isOn ? 'ON' : 'OFF'
      }; ${this.lastOutcome}`,
      this.lastSendFailed ? 'red' : 'green',
    )
  }

  private enqueueSend(text: string, source: string): Promise<SendResult> {
    this.sendQueue = this.sendQueue
      .then(() => this.send(text, source))
      .catch((error) => {
        const reason = SmsService.describeError(error)
        this.lastSendFailed = true
        this.lastOutcome = `Last ${source} send failed: ${reason}`
        this.updateStatus()
        this.reportFailure(source, reason)
        return {
          sent: 0,
          failed: this.recipients.length,
          total: this.recipients.length,
          error: reason,
        }
      })
    return this.sendQueue
  }

  private async send(text: string, source: string): Promise<SendResult> {
    if (this.configError) {
      this.lastSendFailed = true
      this.lastOutcome = `Last attempt failed: ${this.configError}`
      this.updateStatus()
      this.reportFailure(source, this.configError)
      return {
        sent: 0,
        failed: this.recipients.length,
        total: this.recipients.length,
        error: this.configError,
      }
    }

    this.setServiceStatus(
      `Sending SMS to ${this.recipients.length} recipients`,
      'blue',
    )
    const results = await Promise.all(
      this.recipients.map(async (recipient) => {
        try {
          const response = await axios.post<SendlyMessage>(
            SENDLY_MESSAGES_URL,
            { to: recipient, body: text },
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            },
          )
          if (!response.data?.message_id)
            throw new Error('Sendly response has no message ID')
          logger.info('SMS accepted by Sendly', {
            source,
            recipient: SmsService.maskNumber(recipient),
            messageId: response.data.message_id,
          })
          return null
        } catch (error) {
          const reason = SmsService.describeError(error)
          logger.error('SMS send failed', {
            source,
            recipient: SmsService.maskNumber(recipient),
            reason,
          })
          return reason
        }
      }),
    )
    const failureReasons = Array.from(
      new Set(results.filter((reason): reason is string => reason !== null)),
    )
    const failed = results.filter((reason) => reason !== null).length
    const sent = this.recipients.length - failed
    const summary = `${sent}/${this.recipients.length} accepted by Sendly`
    this.lastSendFailed = failed > 0
    this.lastOutcome = `Last ${source} send: ${summary} at ${new Date().toISOString()}`
    if (failureReasons.length > 0) {
      this.lastOutcome += `; ${failureReasons.join(', ')}`
    }
    this.updateStatus()
    if (failed > 0) {
      this.reportFailure(source, `${summary}; ${failureReasons.join(', ')}`)
    } else {
      notifications.emit({ id: 'smsFailure', enabled: false })
      logger.info('SMS series accepted by Sendly', { source, sent })
    }
    return {
      sent,
      failed,
      total: this.recipients.length,
      error: failed > 0 ? `SMS send request failed: ${summary}` : undefined,
    }
  }

  private reportFailure(source: string, reason: string) {
    logger.error('SMS series failed', { source, reason })
    notifications.emit({
      id: 'smsFailure',
      enabled: true,
      extraInfo: reason,
    })
  }
}

export default SmsService
