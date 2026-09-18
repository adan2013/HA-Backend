import { CronJob } from 'cron'
import Entity from '../entities/Entity'
import { entityStateRequest } from '../events/events'
import Timer from '../Timer'
import { emitStateUpdate, mockEntity } from '../utils/testUtils'
import TimeRangeSchedule, { parseTimeRange } from './TimeRangeSchedule'

const loggerError = jest.fn()

jest.mock('../logging/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: loggerError,
    fatal: jest.fn(),
  }),
}))

describe('parseTimeRange', () => {
  it('parses daytime and overnight ranges', () => {
    expect(parseTimeRange('09:05-15:45')).toEqual({
      start: { hour: 9, minute: 5 },
      end: { hour: 15, minute: 45 },
    })
    expect(parseTimeRange('22:00-07:00')).toEqual({
      start: { hour: 22, minute: 0 },
      end: { hour: 7, minute: 0 },
    })
  })

  it.each([
    null,
    '',
    '9:00-15:00',
    '09:00 - 15:00',
    '24:00-15:00',
    '09:60-15:00',
    '09:00-09:00',
  ])('rejects invalid range %s', (value) => {
    expect(parseTimeRange(value)).toBeNull()
  })
})

describe('TimeRangeSchedule', () => {
  const jobs: Array<{ stop: jest.Mock }> = []

  beforeEach(() => {
    loggerError.mockReset()
    jobs.length = 0
    jest.spyOn(Timer, 'onTime').mockImplementation(() => {
      const job = { stop: jest.fn() }
      jobs.push(job)
      return job as unknown as CronJob
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    entityStateRequest.resetListeners()
  })

  const createSchedule = (value = '09:15-15:45') => {
    mockEntity('input_text.schedule', value)
    const onStart = jest.fn()
    const onEnd = jest.fn()
    const schedule = new TimeRangeSchedule(
      Entity.inputText('input_text.schedule'),
      onStart,
      onEnd,
    )
    return { schedule, onStart, onEnd }
  }

  it('creates both jobs without invoking either action', () => {
    const { schedule, onStart, onEnd } = createSchedule()

    expect(Timer.onTime).toHaveBeenNthCalledWith(1, 9, 15, onStart)
    expect(Timer.onTime).toHaveBeenNthCalledWith(2, 15, 45, onEnd)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    expect(schedule.isValid).toBe(true)
  })

  it('stops old jobs and creates replacements after a valid update', () => {
    createSchedule()
    emitStateUpdate('input_text.schedule', '10:30-23:05')

    expect(jobs[0].stop).toHaveBeenCalled()
    expect(jobs[1].stop).toHaveBeenCalled()
    expect(Timer.onTime).toHaveBeenNthCalledWith(
      3,
      10,
      30,
      expect.any(Function),
    )
    expect(Timer.onTime).toHaveBeenNthCalledWith(4, 23, 5, expect.any(Function))
  })

  it('stops all jobs and logs an invalid update', () => {
    const { schedule } = createSchedule()
    emitStateUpdate('input_text.schedule', 'invalid')

    expect(jobs[0].stop).toHaveBeenCalled()
    expect(jobs[1].stop).toHaveBeenCalled()
    expect(Timer.onTime).toHaveBeenCalledTimes(2)
    expect(schedule.isValid).toBe(false)
    expect(loggerError).toHaveBeenCalledWith('Invalid time range schedule', {
      entityId: 'input_text.schedule',
      value: 'invalid',
    })
  })

  it('recreates jobs when an invalid range is repaired', () => {
    const { schedule } = createSchedule('invalid')
    expect(schedule.isValid).toBe(false)

    emitStateUpdate('input_text.schedule', '22:00-07:00')
    expect(schedule.isValid).toBe(true)
    expect(Timer.onTime).toHaveBeenCalledTimes(2)
  })

  it('checks daytime and overnight ranges with minute precision', () => {
    const { schedule } = createSchedule('09:15-15:45')
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 9, 14))).toBe(false)
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 9, 15))).toBe(true)
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 15, 45))).toBe(false)

    emitStateUpdate('input_text.schedule', '22:30-07:15')
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 23, 0))).toBe(true)
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 7, 14))).toBe(true)
    expect(schedule.isActiveAt(new Date(2023, 0, 1, 7, 15))).toBe(false)
  })

  it('stops listening and releases jobs when disposed', () => {
    const { schedule } = createSchedule()
    schedule.dispose()
    emitStateUpdate('input_text.schedule', '10:00-16:00')

    expect(jobs[0].stop).toHaveBeenCalled()
    expect(jobs[1].stop).toHaveBeenCalled()
    expect(Timer.onTime).toHaveBeenCalledTimes(2)
  })
})
