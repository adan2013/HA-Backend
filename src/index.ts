import 'dotenv/config'
import './events/EventEmitterHub'
import { homeAssistantSync } from './events/events'
import WebSocketServerConnector from './connectors/WebSocketServerConnector'
import HomeAssistantConnector from './connectors/HomeAssistantConnector'
import ServiceManager from './services/ServiceManager'
import NotificationsService from './services/NotificationsService/NotificationsService'
import WeatherService from './services/WeatherService/WeatherService'
import BalconyController from './services/BalconyController/BalconyController'
import ReminderService from './services/ReminderService/ReminderService'
import formatDateTime from './utils/formatDateTime'
import LivingRoomController from './services/LivingRoomController/LivingRoomController'
import KitchenController from './services/KitchenController/KitchenController'

console.log(`Timezone: ${process.env['TZ'] || '(default)'}`)
console.log(`System time: ${formatDateTime()}`)
console.log(`Running in ${process.env['ENV']?.toUpperCase()} mode`)
if (process.env['ENV'] === 'dev') {
  console.warn(
    'Dev mode is enabled - all service calls to Home Assistant WILL BE BLOCKED and logged here',
  )
}

new WebSocketServerConnector()
new HomeAssistantConnector()

homeAssistantSync.once(() => {
  const sm = new ServiceManager()
  sm.registerService(new NotificationsService())
  sm.registerService(new WeatherService())
  sm.registerService(new BalconyController())
  sm.registerService(new LivingRoomController())
  sm.registerService(new KitchenController())
  sm.registerService(new ReminderService())
})
