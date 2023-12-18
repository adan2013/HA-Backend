import { EventEmitter } from 'events'

const ee = new EventEmitter()
ee.setMaxListeners(20)

export default ee
