import Service from './Service'
import { ServiceManagerStatus, ServiceStatus } from './types'
import { webSocketMessage } from '../events/events'
import WS_CMD from '../connectors/wsCommands'
import formatDateTime from '../utils/formatDateTime'

class ServiceManager {
  private services: Service[] = []
  private startDate: Date

  constructor() {
    this.startDate = new Date()
    webSocketMessage(WS_CMD.incoming.SYNC_DATA).on(({ sendResponse }) => {
      sendResponse(
        WS_CMD.outgoing.DATA_UPDATE,
        this.getInitialServiceDataObject(),
      )
    })
    webSocketMessage(WS_CMD.incoming.GET_STATUS).on(({ sendResponse }) => {
      sendResponse(WS_CMD.outgoing.STATUS_UPDATE, this.getManagerStatus())
    })
    webSocketMessage(WS_CMD.incoming.SWITCH_SERVICE).on(
      ({ sendResponse, message }) => {
        const { serviceName, enabled } = message
        if (serviceName && enabled !== undefined) {
          const service = this.services.find((s) => s.name === serviceName)
          if (service) {
            service.setServiceEnabled(enabled)
            sendResponse(WS_CMD.outgoing.STATUS_UPDATE, this.getManagerStatus())
          }
        }
      },
    )
  }

  public registerService(service: Service) {
    this.services.push(service)
  }

  public getManagerStatus(): ServiceManagerStatus {
    const now = new Date()
    const timeDiff = now.getTime() - this.startDate.getTime()
    const daysRunning = Math.floor(timeDiff / (1000 * 3600 * 24))
    const services: {
      [name: string]: ServiceStatus
    } = {}
    this.services.forEach((service) => {
      services[service.name] = service.getServiceStatus()
    })
    return {
      currentTime: formatDateTime(),
      startTime: formatDateTime(this.startDate),
      daysRunning,
      services,
    }
  }

  public getInitialServiceDataObject(): {
    [name: string]: object
  } {
    const response: {
      [name: string]: object
    } = {}
    this.services.forEach((service) => {
      const data = service.getServiceData()
      if (data) {
        response[service.name] = data
      }
    })
    return response
  }
}

export default ServiceManager
