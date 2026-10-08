import Entities from './entities.config'

type ThermostatPair = {
  name: string
  thermometerEntityId: string
  radiatorValveExternalTemperatureEntityId: string
  radiatorValveTemperatureSensorEntityId: string
}

const thermostatPairs: ThermostatPair[] = [
  {
    name: 'aniaRoom',
    thermometerEntityId: Entities.sensor.temperature.aniaRoom,
    radiatorValveExternalTemperatureEntityId:
      Entities.number.radiatorValve.aniaRoomExternalTemperature,
    radiatorValveTemperatureSensorEntityId:
      Entities.select.radiatorValve.aniaRoomTemperatureSensor,
  },
  {
    name: 'danielRoom',
    thermometerEntityId: Entities.sensor.temperature.danielRoom,
    radiatorValveExternalTemperatureEntityId:
      Entities.number.radiatorValve.danielRoomExternalTemperature,
    radiatorValveTemperatureSensorEntityId:
      Entities.select.radiatorValve.danielRoomTemperatureSensor,
  },
  {
    name: 'livingRoom',
    thermometerEntityId: Entities.sensor.temperature.livingRoom,
    radiatorValveExternalTemperatureEntityId:
      Entities.number.radiatorValve.livingRoomExternalTemperature,
    radiatorValveTemperatureSensorEntityId:
      Entities.select.radiatorValve.livingRoomTemperatureSensor,
  },
]

export default thermostatPairs
