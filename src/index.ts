import 'dotenv/config'
import './events/EventEmitterHub'
import { homeAssistantSync, notifications } from './events/events'
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
import { checkEnvironmentVariables } from './utils/envVariables'
import WaterLeakService from './services/WaterLeakService/WaterLeakService'
import DeviceMonitorService from './services/DeviceMonitorService/DeviceMonitorService'
import EnergyMonitorService from './services/EnergyMonitorService/EnergyMonitorService'
import DanielRoomController from './services/DanielRoomController/DanielRoomController'
import BroadcastDeviceService from './services/BroadcastDeviceService/BroadcastDeviceService'

checkEnvironmentVariables([
  'ENV',
  'HA_HOST',
  'HA_TOKEN',
  'AQI_API_KEY',
  'AQI_STATION',
  'WEATHER_API_KEY',
  'LOCATION_LAT',
  'LOCATION_LON',
])

console.log(`Timezone: ${process.env['TZ'] || '(default)'}`)
console.log(`System time: ${formatDateTime()}`)
console.log(`Running in ${process.env['ENV']?.toUpperCase()} mode`)
if (process.env['ENV'] === 'dev') {
  console.warn(
    'Dev mode is enabled - all service calls to Home Assistant WILL BE BLOCKED and logged here',
  )
}

const sm = new ServiceManager()
new WebSocketServerConnector()
new HomeAssistantConnector(process.env['HA_HOST'], process.env['HA_TOKEN'])

homeAssistantSync.once(() => {
  sm.registerService(new NotificationsService())
  sm.registerService(
    new WeatherService(
      process.env['WEATHER_API_KEY'],
      process.env['LOCATION_LAT'],
      process.env['LOCATION_LON'],
      process.env['AQI_API_KEY'],
      process.env['AQI_STATION'],
    ),
  )
  sm.registerService(new BalconyController())
  sm.registerService(new LivingRoomController())
  sm.registerService(new KitchenController())
  sm.registerService(new ReminderService())
  sm.registerService(new WaterLeakService())
  sm.registerService(new DeviceMonitorService())
  sm.registerService(new EnergyMonitorService())
  sm.registerService(new DanielRoomController())
  sm.registerService(new BroadcastDeviceService())

  notifications.emit({
    id: 'backendStarted',
    enabled: true,
  })
})
