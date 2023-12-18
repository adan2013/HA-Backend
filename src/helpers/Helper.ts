import { Status, StatusColor } from '../services/types'

class Helper {
  public readonly name: string
  private status: Status

  constructor(helperTypeName: string, name: string) {
    this.name = `${helperTypeName}/${name}`
    this.status = {
      color: 'none',
      message: 'Ready',
    }
  }

  protected setHelperStatus(msg: string, color: StatusColor = 'none') {
    this.status = { message: msg, color }
  }

  public getHelperStatus(): Status {
    return this.status
  }
}

export default Helper
