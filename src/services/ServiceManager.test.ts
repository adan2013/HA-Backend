import ServiceManager from './ServiceManager'
import Service from './Service'
import Helper from '../helpers/Helper'
import { homeAssistantSync, webSocketMessage } from '../events/events'
import WS_CMD from '../connectors/wsCommands'
import { ServiceManagerStatus } from './types'

jest.useFakeTimers().setSystemTime(new Date('2023-05-15T12:00:00Z'))

class TestService extends Service {
  constructor(name: string) {
    super(name)
    this.setServiceData({
      data: 'serviceData',
    })
  }
}

const correctStatus: ServiceManagerStatus = {
  currentTime: '12:00 15-05-2023',
  startTime: '12:00 15-05-2023',
  daysRunning: 0,
  syncedEntitiesCount: 47,
  services: {
    testService: {
      helpers: {
        'testHelper/helperName': {
          color: 'none',
          message: 'Ready',
        },
      },
      status: {
        enabled: true,
        color: 'green',
        message: 'Ready',
      },
    },
    testService2: {
      helpers: {},
      status: {
        enabled: true,
        color: 'green',
        message: 'Ready',
      },
    },
  },
}

const initializeTestServiceManager = () => {
  const manager = new ServiceManager()
  const service = new TestService('testService')
  const service2 = new TestService('testService2')
  const helper = new Helper('testHelper', 'helperName')
  service.registerHelper(helper)
  manager.registerService(service)
  manager.registerService(service2)
  homeAssistantSync.emit({
    entitiesCount: 47,
  })
  return manager
}

describe('ServiceManager', () => {
  it('should return the list with service data', () => {
    initializeTestServiceManager()
    const sendResponse = jest.fn()
    webSocketMessage(WS_CMD.incoming.SYNC_DATA).emit({
      message: {},
      sendResponse,
    })
    expect(sendResponse).toBeCalledWith(WS_CMD.outgoing.DATA_UPDATE, {
      testService: {
        data: 'serviceData',
      },
      testService2: {
        data: 'serviceData',
      },
    })
  })

  it('should return the correct manager status', () => {
    initializeTestServiceManager()
    const sendResponse = jest.fn()
    webSocketMessage(WS_CMD.incoming.GET_STATUS).emit({
      message: {},
      sendResponse,
    })
    expect(sendResponse).toBeCalledWith(
      WS_CMD.outgoing.STATUS_UPDATE,
      correctStatus,
    )
  })

  it('should switch the service off and return status update', () => {
    initializeTestServiceManager()
    const sendResponse = jest.fn()
    webSocketMessage(WS_CMD.incoming.SWITCH_SERVICE).emit({
      message: {
        serviceName: 'testService',
        enabled: false,
      },
      sendResponse,
    })
    const status = JSON.parse(JSON.stringify(correctStatus))
    status.services.testService.status.enabled = false
    expect(sendResponse).toBeCalledWith(WS_CMD.outgoing.STATUS_UPDATE, status)
  })
})
