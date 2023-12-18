import { WebSocketServer } from 'ws'
import { webSocketMessage, serviceDataUpdate } from '../events/events'
import WS_CMD from './wsCommands'
import wsCommands from './wsCommands'

class WebSocketServerConnector {
  private PORT = 8008
  private wss: WebSocketServer

  public constructor() {
    this.wss = new WebSocketServer({
      port: this.PORT,
    })
    console.log('WS server listening on port ' + this.PORT)
    this.wss.on('connection', (ws) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require('../../package.json')
      ws.send(
        JSON.stringify({
          type: wsCommands.outgoing.WELCOME,
          version: packageJson.version,
        }),
      )
      ws.on('message', (incomingData) => {
        try {
          const message = JSON.parse(incomingData.toString())
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }))
              break
            default:
              webSocketMessage(message.type).emit({
                message,
                sendResponse: (msgType, payload) => {
                  ws.send(JSON.stringify({ type: msgType, data: payload }))
                },
              })
          }
        } catch {
          console.error('Error parsing incoming message', incomingData)
        }
      })
    })
    serviceDataUpdate.on(({ serviceName, data }) => {
      const msg = JSON.stringify({
        type: WS_CMD.outgoing.DATA_UPDATE,
        data: {
          [serviceName]: data,
        },
      })
      this.wss.clients.forEach((client) => {
        client.send(msg)
      })
    })
  }
}

export default WebSocketServerConnector
