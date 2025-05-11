import { MessageEvent, WebSocket } from 'ws'
import { EntityState, MessageOptions, SocketMessageInterface } from './types'
import {
  homeAssistantEvent,
  homeAssistantResult,
  entityUpdate,
  serviceCall,
  homeAssistantSync,
  entityStateRequest,
  anyEntityUpdate,
} from '../events/events'

const RECONNECT_INTERVAL = 10000
const ENTITIES_PROBE_INTERVAL = 60000

class HomeAssistantConnector {
  private readonly host: string
  private readonly token: string
  private readonly requiredEntities: number
  private msgId = 1
  private socket: WebSocket | undefined

  entities: EntityState[] = []

  static mapEntityState(haEntity: never): EntityState {
    return {
      id: haEntity['entity_id'],
      state: haEntity['state'],
      lastChanged: haEntity['last_changed'],
      lastUpdated: haEntity['last_updated'],
      attributes: haEntity['attributes'],
    }
  }

  private connectToHomeAssistant() {
    this.socket = new WebSocket(`ws://${this.host}/api/websocket`)
    this.socket.onmessage = (e) => this.onReceive(e)
    this.socket.onclose = () => {
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
      this.callService(entityId, domain, service, data)
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
      this.entities = entities
      console.log(
        `Backend initialized successfully with ${this.entities.length} entities`,
      )
      homeAssistantSync.emit({
        entitiesCount: this.entities.length,
      })
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
            const changedEntityIndex = this.entities.findIndex(
              (e) => e.id === newState.entity_id,
            )
            if (changedEntityIndex >= 0) {
              const updatedState = HomeAssistantConnector.mapEntityState(
                newState as never,
              )
              this.entities[changedEntityIndex] = updatedState
              entityUpdate(updatedState.id).emit(updatedState)
              anyEntityUpdate.emit(updatedState)
            }
          }
        },
      },
    )
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
          console.error(
            '"auth_invalid" message received from HA - check your access token',
          )
          return
        case 'auth_ok':
          if (this.requiredEntities === 0) {
            console.log('No required entities count set, skipping probe')
            this.syncWithHomeAssistant()
          } else {
            this.probeEntities()
          }
          return
        case 'result':
          if (msg['success']) {
            homeAssistantResult(msg.id).emit(msg)
          } else {
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
  ) {
    if (process.env['ENV'] === 'dev') {
      const payloadKeys = Object.keys(data)
      console.log(
        `CALL > ${domain}.${service}; entity: ${entityId}; payload: ${
          payloadKeys.length > 0 ? payloadKeys.join(',') : '(empty)'
        }`,
      )
      return
    }
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
          if (!resp['success']) {
            console.error(
              `Failed to call service ${domain}.${service} for entity ${entityId}!`,
            )
          }
        },
      },
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
