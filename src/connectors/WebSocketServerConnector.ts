import { WebSocket, WebSocketServer } from 'ws'
import {
  anyEntityUpdate,
  homeAssistantStatusUpdate,
  homeAssistantSync,
  serviceDataUpdate,
  webSocketMessage,
} from '../events/events'
import HomeAssistantConnector from './HomeAssistantConnector'
import WS_CMD from './wsCommands'

const AUTH_TIMEOUT = 10000
const MAX_PAYLOAD_SIZE = 64 * 1024

type IncomingMessage = {
  type?: string
  accessToken?: string
  requestId?: string
  subscriptionId?: string
  entityId?: string | string[]
  domain?: string
  service?: string
  data?: object
  historyLength?: number
  attribute?: string
  [key: string]: unknown
}

class WebSocketServerConnector {
  private readonly PORT = 8008
  private readonly wss: WebSocketServer
  private readonly authenticatedClients = new WeakSet<WebSocket>()
  private readonly subscriptions = new Map<WebSocket, Map<string, string>>()

  public constructor(
    private readonly accessToken: string,
    private readonly homeAssistant: HomeAssistantConnector,
  ) {
    this.wss = new WebSocketServer({
      port: this.PORT,
      maxPayload: MAX_PAYLOAD_SIZE,
    })
    console.log('WS server listening on port ' + this.PORT)
    this.wss.on('connection', (ws) => this.handleConnection(ws))

    serviceDataUpdate.on(({ serviceName, data }) => {
      this.broadcast({
        type: WS_CMD.outgoing.DATA_UPDATE,
        data: { [serviceName]: data },
      })
    })
    homeAssistantStatusUpdate.on(({ status }) => {
      this.broadcast({ type: WS_CMD.outgoing.HA_STATUS, status })
    })
    anyEntityUpdate.on((state) => this.broadcastEntityUpdate(state.id, state))
    homeAssistantSync.on(() => this.resendSubscribedEntities())
  }

  private handleConnection(ws: WebSocket) {
    this.subscriptions.set(ws, new Map())
    this.send(ws, { type: WS_CMD.outgoing.AUTH_REQUIRED })
    const authTimeout = setTimeout(
      () => ws.close(1008, 'Authentication timeout'),
      AUTH_TIMEOUT,
    )

    ws.on('close', () => {
      clearTimeout(authTimeout)
      this.subscriptions.delete(ws)
    })
    ws.on('message', (incomingData) => {
      try {
        const message = JSON.parse(incomingData.toString()) as IncomingMessage
        if (!this.authenticatedClients.has(ws)) {
          if (
            message.type === WS_CMD.incoming.AUTH &&
            this.isValidToken(message.accessToken)
          ) {
            clearTimeout(authTimeout)
            this.authenticatedClients.add(ws)
            this.send(ws, { type: WS_CMD.outgoing.AUTH_OK })
            this.sendWelcome(ws)
            this.send(ws, {
              type: WS_CMD.outgoing.HA_STATUS,
              status: this.homeAssistant.connectionState,
            })
          } else {
            this.send(ws, { type: WS_CMD.outgoing.AUTH_INVALID })
            ws.close(1008, 'Invalid access token')
          }
          return
        }
        if (message.type === 'ping') {
          this.send(ws, { type: 'pong' })
          return
        }
        this.handleAuthenticatedMessage(ws, message)
      } catch {
        this.send(ws, { type: 'error', error: 'Invalid message' })
      }
    })
  }

  private handleAuthenticatedMessage(ws: WebSocket, message: IncomingMessage) {
    switch (message.type) {
      case WS_CMD.incoming.SUBSCRIBE_ENTITY:
        this.subscribeEntity(ws, message)
        break
      case WS_CMD.incoming.UNSUBSCRIBE_ENTITY:
        if (typeof message.subscriptionId === 'string') {
          this.subscriptions.get(ws)?.delete(message.subscriptionId)
        }
        break
      case WS_CMD.incoming.CALL_SERVICE:
        void this.callService(ws, message)
        break
      case WS_CMD.incoming.GET_ENTITY_HISTORY:
        void this.getEntityHistory(ws, message)
        break
      case WS_CMD.incoming.GET_ENTITIES:
        this.getEntities(ws, message)
        break
      default:
        webSocketMessage(message.type || 'unknown').emit({
          message,
          sendResponse: (msgType, payload) => {
            this.send(ws, { type: msgType, data: payload })
          },
        })
    }
  }

  private subscribeEntity(ws: WebSocket, message: IncomingMessage) {
    if (
      typeof message.entityId !== 'string' ||
      typeof message.subscriptionId !== 'string'
    ) {
      this.sendSubscriptionError(
        ws,
        message.subscriptionId,
        'Invalid subscription',
      )
      return
    }
    const state = this.homeAssistant.getEntityState(message.entityId)
    if (!state) {
      this.sendSubscriptionError(ws, message.subscriptionId, 'Entity not found')
      return
    }
    this.subscriptions.get(ws)?.set(message.subscriptionId, message.entityId)
    this.send(ws, {
      type: WS_CMD.outgoing.ENTITY_STATE,
      subscriptionId: message.subscriptionId,
      data: state,
    })
  }

  private async callService(ws: WebSocket, message: IncomingMessage) {
    if (
      typeof message.requestId !== 'string' ||
      typeof message.domain !== 'string' ||
      typeof message.service !== 'string' ||
      (message.entityId !== undefined &&
        typeof message.entityId !== 'string' &&
        !Array.isArray(message.entityId)) ||
      (message.data !== undefined &&
        (typeof message.data !== 'object' || message.data === null))
    ) {
      this.sendCommandResult(
        ws,
        message.requestId,
        false,
        undefined,
        'Invalid service call',
      )
      return
    }
    try {
      const result = await this.homeAssistant.callService(
        message.entityId,
        message.domain,
        message.service,
        message.data,
        { executeInDev: true },
      )
      this.sendCommandResult(ws, message.requestId, true, result)
    } catch (error) {
      this.sendCommandResult(
        ws,
        message.requestId,
        false,
        undefined,
        this.errorMessage(error),
      )
    }
  }

  private async getEntityHistory(ws: WebSocket, message: IncomingMessage) {
    const historyLength = Number(message.historyLength || 0)
    if (
      typeof message.requestId !== 'string' ||
      typeof message.entityId !== 'string' ||
      !Number.isFinite(historyLength) ||
      historyLength < 0
    ) {
      this.sendCommandResult(
        ws,
        message.requestId,
        false,
        undefined,
        'Invalid history request',
      )
      return
    }
    try {
      const history = await this.homeAssistant.getEntityHistory(
        message.entityId,
        historyLength,
      )
      this.send(ws, {
        type: WS_CMD.outgoing.ENTITY_HISTORY_RESULT,
        requestId: message.requestId,
        data: history,
      })
    } catch (error) {
      this.sendCommandResult(
        ws,
        message.requestId,
        false,
        undefined,
        this.errorMessage(error),
      )
    }
  }

  private getEntities(ws: WebSocket, message: IncomingMessage) {
    if (
      typeof message.requestId !== 'string' ||
      (message.attribute !== undefined && typeof message.attribute !== 'string')
    ) {
      this.sendCommandResult(
        ws,
        message.requestId,
        false,
        undefined,
        'Invalid entities request',
      )
      return
    }
    this.send(ws, {
      type: WS_CMD.outgoing.ENTITIES_RESULT,
      requestId: message.requestId,
      data: this.homeAssistant.getEntities(message.attribute),
    })
  }

  private sendWelcome(ws: WebSocket) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const packageJson = require('../../package.json')
    this.send(ws, {
      type: WS_CMD.outgoing.WELCOME,
      version: packageJson.version,
    })
  }

  private isValidToken(candidate: unknown): boolean {
    return typeof candidate === 'string' && candidate === this.accessToken
  }

  private sendCommandResult(
    ws: WebSocket,
    requestId: unknown,
    success: boolean,
    result?: unknown,
    error?: string,
  ) {
    this.send(ws, {
      type: WS_CMD.outgoing.COMMAND_RESULT,
      requestId,
      success,
      result,
      error,
    })
  }

  private sendSubscriptionError(
    ws: WebSocket,
    subscriptionId: unknown,
    error: string,
  ) {
    this.send(ws, {
      type: WS_CMD.outgoing.SUBSCRIPTION_ERROR,
      subscriptionId,
      error,
    })
  }

  private broadcastEntityUpdate(entityId: string, state: object) {
    this.subscriptions.forEach((clientSubscriptions, client) => {
      clientSubscriptions.forEach((subscribedEntityId, subscriptionId) => {
        if (subscribedEntityId === entityId) {
          this.send(client, {
            type: WS_CMD.outgoing.ENTITY_CHANGED,
            subscriptionId,
            data: state,
          })
        }
      })
    })
  }

  private resendSubscribedEntities() {
    this.subscriptions.forEach((clientSubscriptions, client) => {
      clientSubscriptions.forEach((entityId, subscriptionId) => {
        const state = this.homeAssistant.getEntityState(entityId)
        if (state) {
          this.send(client, {
            type: WS_CMD.outgoing.ENTITY_STATE,
            subscriptionId,
            data: state,
          })
        }
      })
    })
  }

  private broadcast(message: object) {
    this.wss.clients.forEach((client) => {
      if (this.authenticatedClients.has(client)) this.send(client, message)
    })
  }

  private send(ws: WebSocket, message: object) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
  }
}

export default WebSocketServerConnector
