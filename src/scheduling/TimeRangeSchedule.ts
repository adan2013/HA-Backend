import { CronJob } from 'cron'
import InputTextEntity from '../entities/InputTextEntity'
import Timer from '../Timer'
import { createLogger } from '../logging/logger'

type TimeOfDay = {
  hour: number
  minute: number
}

export type TimeRange = {
  start: TimeOfDay
  end: TimeOfDay
}

const TIME_RANGE_PATTERN =
  /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/

export const parseTimeRange = (value: string | null): TimeRange | null => {
  if (!value) return null
  const match = TIME_RANGE_PATTERN.exec(value)
  if (!match) return null

  const [, startHour, startMinute, endHour, endMinute] = match
  if (startHour === endHour && startMinute === endMinute) return null

  return {
    start: { hour: Number(startHour), minute: Number(startMinute) },
    end: { hour: Number(endHour), minute: Number(endMinute) },
  }
}

class TimeRangeSchedule {
  private readonly entity: InputTextEntity
  private readonly onStart: () => void
  private readonly onEnd: () => void
  private readonly unsubscribe: () => void
  private readonly logger = createLogger('TimeRangeSchedule')
  private startJob?: CronJob
  private endJob?: CronJob
  private range: TimeRange | null = null

  get isValid() {
    return this.range !== null
  }

  constructor(entity: InputTextEntity, onStart: () => void, onEnd: () => void) {
    this.entity = entity
    this.onStart = onStart
    this.onEnd = onEnd
    this.applyValue(entity.textValue)
    this.unsubscribe = entity.onChange((value) => this.applyValue(value))
  }

  public isActiveAt(date = new Date()): boolean {
    if (!this.range) return false
    const current = date.getHours() * 60 + date.getMinutes()
    const start = this.range.start.hour * 60 + this.range.start.minute
    const end = this.range.end.hour * 60 + this.range.end.minute
    return start < end
      ? current >= start && current < end
      : current >= start || current < end
  }

  public dispose() {
    this.stopJobs()
    this.unsubscribe()
  }

  private applyValue(value: string | null) {
    this.stopJobs()
    this.range = parseTimeRange(value)
    if (!this.range) {
      this.logger.error('Invalid time range schedule', {
        entityId: this.entity.entityId,
        value,
      })
      return
    }

    this.startJob = Timer.onTime(
      this.range.start.hour,
      this.range.start.minute,
      this.onStart,
    )
    this.endJob = Timer.onTime(
      this.range.end.hour,
      this.range.end.minute,
      this.onEnd,
    )
  }

  private stopJobs() {
    this.startJob?.stop()
    this.endJob?.stop()
    this.startJob = undefined
    this.endJob = undefined
  }
}

export default TimeRangeSchedule
