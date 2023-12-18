import { CronJob } from 'cron'

type TickCallback = () => void

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

class Timer {
  private static getCronTime(
    hr: number | string,
    min: number | string,
    day: number | string = '*',
    month: number | string = '*',
    dayOfWeek: DayOfWeek | string = '*',
  ): string {
    return `${min} ${hr} ${day} ${month} ${dayOfWeek}`
  }

  public static onTime(
    hr: number,
    min: number,
    callback: TickCallback,
  ): CronJob {
    const time = this.getCronTime(hr, min)
    return new CronJob(time, callback, null, true)
  }

  public static onEveryMinute(callback: TickCallback): CronJob {
    const time = this.getCronTime('*', '*')
    return new CronJob(time, callback, null, true)
  }

  public static onDayOfWeek(day: DayOfWeek, callback: TickCallback): CronJob {
    const time = this.getCronTime('12', '0', '*', '*', day)
    return new CronJob(time, callback, null, true)
  }
}

export default Timer
