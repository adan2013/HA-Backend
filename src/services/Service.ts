import { Status, ServiceStatus, StatusColor } from './types'
import Helper from '../helpers/Helper'
import { serviceDataUpdate } from '../events/events'

class Service {
  public readonly name: string
  protected status: Status
  private helpers: Helper[] = []
  protected publicData: object | null = null

  get isDisabled() {
    return !this.status.enabled
  }

  constructor(name: string) {
    this.name = name
    this.status = {
      color: 'green',
      message: 'Ready',
      enabled: true,
    }
  }

  public registerHelper(helper: Helper) {
    this.helpers.push(helper)
  }

  protected setServiceStatus(msg: string, color: StatusColor = 'green') {
    this.status.message = msg
    this.status.color = color
  }

  public setServiceEnabled(enabled: boolean) {
    this.status.enabled = enabled
  }

  public getServiceStatus(): ServiceStatus {
    const helpers: {
      [name: string]: Status
    } = {}
    this.helpers.forEach((helper) => {
      helpers[helper.name] = helper.getHelperStatus()
    })
    return {
      status: this.status,
      helpers,
    }
  }

  protected setServiceData(data: object) {
    this.publicData = data
    serviceDataUpdate.emit({
      serviceName: this.name,
      data,
    })
  }

  public getServiceData(): object | null {
    return this.publicData
  }
}

export default Service
