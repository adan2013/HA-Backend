import { MessageEvent, WebSocket } from 'ws'
import axios from 'axios'
import {
  EntityState,
  HomeAssistantConnectionState,
  MessageOptions,
  SensorHistoryItem,
  SocketMessageInterface,
} from './types'
import {
  homeAssistantEvent,
  homeAssistantResult,
  entityUpdate,
  serviceCall,
  homeAssistantSync,
  entityStateRequest,
  anyEntityUpdate,
  entityReported,
  homeAssistantStatusUpdate,
} from '../events/events'
import { parseBatteryReading } from '../utils/batteryUtils'

const RECONNECT_INTERVAL = 10000
const ENTITIES_PROBE_INTERVAL = 60000
const ENTITIES_REFRESH_INTERVAL = 60 * 60 * 1000

class HomeAssistantConnector {
  private readonly host: string
  private readonly token: string
  private readonly requiredEntities: number
  private msgId = 1
  private socket: WebSocket | undefined
  private entitiesRefreshTimer: NodeJS.Timeout | undefined
  private status: HomeAssistantConnectionState = 'disconnected'

  entities: EntityState[] = []

  public get connectionState(): HomeAssistantConnectionState {
    return this.status
  }

  private changeStatus(status: HomeAssistantConnectionState) {
    this.status = status
    homeAssistantStatusUpdate.emit({ status })
  }

  static mapEntityState(haEntity: never): EntityState {
    return {
      id: haEntity['entity_id'],
      state: haEntity['state'],
      lastChanged: haEntity['last_changed'],
      lastUpdated: haEntity['last_updated'],
      lastReported: haEntity['last_reported'] || haEntity['last_updated'],
      attributes: haEntity['attributes'],
    }
  }

  private connectToHomeAssistant() {
    this.socket = new WebSocket(`ws://${this.host}/api/websocket`)
    this.socket.onopen = () => this.changeStatus('connected')
    this.socket.onmessage = (e) => this.onReceive(e)
    this.socket.onclose = () => {
      if (this.entitiesRefreshTimer) {
        clearInterval(this.entitiesRefreshTimer)
        this.entitiesRefreshTimer = undefined
      }
      this.changeStatus('disconnected')
      console.error('Connection to Home Assistant closed!')
      setTimeout(() => this.connectToHomeAssistant(), RECONNECT_INTERVAL)
    }
    this.socket.onerror = (err) => {
      console.error('HA websocket error', err)
    }
  }

  public constructor(host?: string, token?: string, requiredEntities?: string) {
    if (!host || !token) {
      console.error('Missing HA_HOST or HA_TOKEN env variable!')
      throw new Error('Missing basic env variables')
    }
    this.host = host
    this.token = token
    this.requiredEntities = Number(requiredEntities) || 0
    this.connectToHomeAssistant()
    entityStateRequest.on(({ entityId, callback }) => {
      const entityState = this.entities.find((e) => e.id === entityId)
      if (entityState) {
        callback(entityState)
      } else {
        console.warn(`WARN: State request for unknown entity ${entityId}`)
      }
    })
    serviceCall.on(({ domain, service, entityId, data }) => {
      void this.callService(entityId, domain, service, data).catch((error) => {
        console.error(
          `Failed to call service ${domain}.${service} for entity ${entityId}`,
          error,
        )
      })
    })
  }

  private probeEntities() {
    console.log(`Probing entities for required count: ${this.requiredEntities}`)
    this.getAllEntities((entities) => {
      if (entities.length < this.requiredEntities) {
        console.warn(
          `WARN: Found ${entities.length} entities; Next probe in ${
            ENTITIES_PROBE_INTERVAL / 1000
          } seconds...`,
        )
        setTimeout(() => this.probeEntities(), ENTITIES_PROBE_INTERVAL)
      } else {
        console.log(`Found ${entities.length} entities; Starting backend...`)
        this.syncWithHomeAssistant()
      }
    })
  }

  private getAllEntities(callback: (entities: EntityState[]) => void) {
    this.sendMsg(
      'get_states',
      {},
      {
        resultCallback: (resp) => {
          callback(resp.result.map(HomeAssistantConnector.mapEntityState))
        },
      },
    )
  }

  private syncWithHomeAssistant() {
    this.getAllEntities((entities) => {
      this.replaceEntities(entities)
      console.log(
        `Backend initialized successfully with ${this.entities.length} entities`,
      )
      this.changeStatus('synced')
      homeAssistantSync.emit({
        entitiesCount: this.entities.length,
      })
      this.startEntitiesRefresh()
    })
    this.sendMsg(
      'subscribe_events',
      { event_type: 'state_changed' },
      {
        resultCallback: () => {
          console.log('Subscribed to state_changed event')
        },
        eventCallback: (event) => {
          const newState = event.data['new_state']
          if (newState) {
            const updatedState = HomeAssistantConnector.mapEntityState(
              newState as never,
            )
            const updatedEntities = this.entities.some(
              (entity) => entity.id === updatedState.id,
            )
              ? this.entities.map((entity) =>
                  entity.id === updatedState.id ? updatedState : entity,
                )
              : [...this.entities, updatedState]
            this.entities = updatedEntities
            entityUpdate(updatedState.id).emit(updatedState)
            anyEntityUpdate.emit(updatedState)
          }
        },
      },
    )
  }

  private startEntitiesRefresh() {
    if (this.entitiesRefreshTimer) clearInterval(this.entitiesRefreshTimer)
    this.entitiesRefreshTimer = setInterval(() => {
      this.getAllEntities((entities) => this.replaceEntities(entities, true))
    }, ENTITIES_REFRESH_INTERVAL)
    this.entitiesRefreshTimer.unref()
  }

  private replaceEntities(entities: EntityState[], notifyChanges = false) {
    const previousById = new Map(
      this.entities.map((entity) => [entity.id, entity]),
    )
    this.entities = entities
    if (!notifyChanges) return

    this.entities.forEach((entity) => {
      const previous = previousById.get(entity.id)
      const stateChanged =
        !previous ||
        previous.lastUpdated !== entity.lastUpdated
      if (stateChanged) {
        entityUpdate(entity.id).emit(entity)
        anyEntityUpdate.emit(entity)
      } else if (previous.lastReported !== entity.lastReported) {
        entityReported.emit(entity)
      }
    })
  }

  private onReceive(e: MessageEvent) {
    try {
      const msg = JSON.parse(e.data.toString())
      switch (msg.type) {
        case 'auth_required':
          console.log('Connected to Home Assistant. Authenticating...')
          this.sendMsg(
            'auth',
            { access_token: this.token },
            {
              includeId: false,
            },
          )
          return
        case 'auth_invalid':
          this.changeStatus('authError')
          console.error(
            '"auth_invalid" message received from HA - check your access token',
          )
          return
        case 'auth_ok':
          this.changeStatus('authorized')
          if (this.requiredEntities === 0) {
            console.log('No required entities count set, skipping probe')
            this.syncWithHomeAssistant()
          } else {
            this.probeEntities()
          }
          return
        case 'result':
          homeAssistantResult(msg.id).emit(msg)
          if (!msg['success']) {
            console.warn('Result message not successful', msg.error)
          }
          break
        case 'event':
          homeAssistantEvent(msg.id).emit(msg['event'])
          break
        case 'ping':
          this.sendMsg('pong', {}, { includeId: false })
          break
        case 'pong':
          break
        default:
          console.warn('Unhandled message type from HA', msg)
      }
    } catch {
      console.error('Error while parsing message from Home Assistant', e.data)
    }
  }

  public callService(
    entityId: string | string[] | undefined,
    domain: string,
    service: string,
    data: object = {},
    options: { executeInDev?: boolean } = {},
  ): Promise<unknown> {
    if (process.env['ENV'] === 'dev' && !options.executeInDev) {
      const payloadKeys = Object.keys(data)
      console.log(
        `CALL > ${domain}.${service}; entity: ${entityId}; payload: ${
          payloadKeys.length > 0 ? JSON.stringify(data) : '(empty)'
        }`,
      )
      return Promise.resolve(undefined)
    }
    if (
      this.status !== 'synced' ||
      this.socket?.readyState !== WebSocket.OPEN
    ) {
      return Promise.reject(new Error('Home Assistant is not connected'))
    }
    return new Promise((resolve, reject) => {
      this.sendMsg(
        'call_service',
        {
          domain,
          service,
          service_data: data,
          target: {
            entity_id: entityId,
          },
        },
        {
          resultCallback: (resp) => {
            if (resp['success']) {
              resolve(resp['result'])
              return
            }
            reject(
              new Error(
                resp['error']?.message ||
                  'Home Assistant rejected the service call',
              ),
            )
          },
        },
      )
    })
  }

  public getEntityState(entityId: string): EntityState | undefined {
    return this.entities.find((entity) => entity.id === entityId)
  }

  public getBatteryEntities(): EntityState[] {
    return this.entities.filter((entity) => parseBatteryReading(entity))
  }

  public async getEntityHistory(
    entityId: string,
    historyLength = 0,
  ): Promise<SensorHistoryItem[]> {
    let timestamp = ''
    if (historyLength > 0) {
      const date = new Date()
      date.setMinutes(date.getMinutes() - historyLength)
      timestamp = `/${date.toISOString()}`
    }
    const currentTimestamp = new Date().toISOString()
    const response = await axios.get(
      `http://${this.host}/api/history/period${timestamp}`,
      {
        headers: {
          authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        params: {
          filter_entity_id: entityId,
          no_attributes: true,
          end_time: currentTimestamp,
        },
      },
    )
    const data = response?.data?.[0] || []
    return data.map(
      (item: { last_updated: string; state: string }, index: number) => ({
        id: index,
        time: item.last_updated,
        value: Number.parseFloat(item.state),
      }),
    )
  }

  private sendMsg(
    type: string,
    payload: object = {},
    options: Partial<MessageOptions> = {},
  ) {
    const msgOptions: MessageOptions = {
      includeId: true,
      ...options,
    }
    const msg: SocketMessageInterface = {
      type,
      ...payload,
    }
    if (msgOptions.includeId) {
      msg.id = this.msgId
      this.msgId += 1
    }
    if (msgOptions.resultCallback && msg.id) {
      homeAssistantResult(msg.id).once(msgOptions.resultCallback)
    }
    if (msgOptions.eventCallback && msg.id) {
      homeAssistantEvent(msg.id).on(msgOptions.eventCallback)
    }
    this.socket?.send(JSON.stringify(msg))
  }
}

export default HomeAssistantConnector
