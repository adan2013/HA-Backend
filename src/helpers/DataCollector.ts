import Helper from './Helper'

type DataQueueType = {
  timestamp: number
  value: number
}

class DataCollector extends Helper {
  private readonly precision: number
  private readonly historyLimit: number
  private readonly frequency: number
  private dataQueue: DataQueueType[] = []
  private saveCounter: number

  constructor(
    name: string,
    precision: number,
    historyLimit: number,
    savingFrequency = 1,
  ) {
    super('dataCollector', name)
    if (precision < 0) {
      throw new Error('Precision must be greater or equal to 0')
    }
    if (historyLimit <= 0) {
      throw new Error('Limit value must be greater than 0')
    }
    if (savingFrequency < 1 || savingFrequency > historyLimit) {
      throw new Error('Saving frequency must be between 1 and history limit')
    }
    this.precision = precision
    this.historyLimit = historyLimit
    this.frequency = savingFrequency
    this.saveCounter = savingFrequency
    this.refreshStatus()
  }

  private refreshStatus() {
    this.setHelperStatus(
      `In queue: ${this.dataQueue.length}/${this.historyLimit}${
        this.frequency > 1 ? `, Saving every ${this.frequency} values` : ''
      }`,
      this.dataQueue.length >= this.historyLimit ? 'green' : 'blue',
    )
  }

  private reduceDataQueue() {
    if (this.dataQueue.length > this.historyLimit) {
      this.dataQueue = this.dataQueue.slice(this.historyLimit * -1)
    }
  }

  public saveValue(value: number, customDate?: Date) {
    if (this.frequency > 1) {
      this.saveCounter++
      if (this.saveCounter < this.frequency) {
        return
      }
      this.saveCounter = 0
    }
    const precisionPower = 10 ** this.precision
    const roundedValue = Math.round(value * precisionPower) / precisionPower
    this.dataQueue.push({
      timestamp: customDate?.getTime() || new Date().getTime(),
      value: roundedValue,
    })
    this.reduceDataQueue()
    this.refreshStatus()
  }

  public clearData() {
    this.dataQueue = []
    this.refreshStatus()
  }

  public getValues(): number[] {
    return this.dataQueue.map((d) => d.value)
  }
}

export default DataCollector
