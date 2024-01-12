# Home Assistant backend

This is the Home Assistant backend, which is responsible for my smart home setup. Previously, I was using Node-RED for this purpose, but I decided to switch to a custom Node backend because it is more flexible and clear for me as a JavaScript developer.

Before, I reached a point where I did not know how to create a desired automation using the Node-RED blocks, but I knew how I would program it with normal code. I began to use the function blocks more and more often, so the idea of no-code stopped mattering to me, and I decided to move all my automations to code.

The dedicated frontend for this backend is [here](https://github.com/adan2013/HA-Dashboard).

![data flow home assistant](docs/data-flow.png)

## Scripts

| COMMAND           | DESCRIPTION                                         |
|-------------------|-----------------------------------------------------|
| yarn start        | start a developer server (HA service calls blocked) |
| yarn build        | build a production build                            |
| yarn start:prod   | start a developer server in production mode         |
| yarn start:build  | run a production build                              |
| yarn lint         | run eslint                                          |
| yarn test         | run unit tests                                      |
| yarn docker-build | build the docker image                              |
| yarn docker-run   | run the docker image                                |

## Environment variables

| VARIABLE        | DESCRIPTION                           |
|-----------------|---------------------------------------|
| TZ              | timezone ID                           |
| HA_HOST         | IP address of Home Assistant instance |
| HA_TOKEN        | access token for Home Assistant       |
| AQI_API_KEY     | access token for AQICN API            |
| AQI_STATION     | ID of the AQICN air quality station   |
| WEATHER_API_KEY | access token for OpenWeatherMap API   |
| LOCATION_LAT    | house location - latitude             |
| LOCATION_LON    | house location - longitude            |

## Helpers

### DataCollector
Allows to store historical data in queue. For exaple, it is used to collect values of temperature, wind speed and pressure from the weather API.

### DebouncedNumericToggle
Very useful tool that allows you to convert the numeric value to the toggle with the debounce functionality. I am using it to determine when my washing machine is working, depending on the power consumption reported by the smart plug.

### StateMachine
Simple state machine implementation with implemented "auto-return" functionality and Type-Script support.

## Services

### BalconyController
The service is using the CRON job to turn on and off the Christmas lights on the balcony.

### KitchenController
Custom logic for my automatic lights in the kitchen. It uses an Aqara motion and light sensor to automatically turn on the lights if someone enters the kitchen.

### LivingRoomController
Custom logic for all the lights in the living room. For now, it contains four different light sources and one Aqara Opple remote.

### NotificationsService
It is responsible for controlling the active notifications that are displayed on the dashboard. It is also responsible for setting the notification light behind the tablet and playing sound alerts through the buzzer.

### ReminderService
It is a group service that contains all the micro-integrations related to reminders - for example: ready laundry or opened main doors.

### WeatherService
Is collecting weather data from the OpenWeatherMap API by using "OneCall API 3.0". The air quality index is collected from the AQICN API, because I was unhappy with the measurement precision of the Air Pollution API from OpenWeatherMap.
