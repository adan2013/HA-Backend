import Service from '../Service'
import Entity from '../../entities/Entity'
import EntityValueSyncHelper from '../../helpers/EntityValueSyncHelper'
import thermostatPairs from '../../configs/thermostat.config'

const EXTERNAL_TEMPERATURE_PRECISION = 1
const EXTERNAL_TEMPERATURE_SENSOR_MODE = 'external'

class ThermostatController extends Service {
  private temperatureSensorModes = thermostatPairs.map((pair) => ({
    name: pair.name,
    entity: Entity.general(pair.radiatorValveTemperatureSensorEntityId),
  }))

  constructor() {
    super('thermostatController')
    thermostatPairs.forEach((pair) => {
      this.registerHelper(
        new EntityValueSyncHelper({
          name: pair.name,
          sourceEntityId: pair.thermometerEntityId,
          targetEntityId: pair.radiatorValveExternalTemperatureEntityId,
          precision: EXTERNAL_TEMPERATURE_PRECISION,
        }),
      )
    })
    this.temperatureSensorModes.forEach(({ entity }) =>
      entity.onAnyStateUpdate(() => this.checkTemperatureSensorModes()),
    )
    this.checkTemperatureSensorModes()
  }

  private checkTemperatureSensorModes() {
    const invalidValveNames = this.temperatureSensorModes
      .filter(
        ({ entity }) =>
          entity.state?.state !== EXTERNAL_TEMPERATURE_SENSOR_MODE,
      )
      .map(({ name }) => name)
    const syncInfo = `Synchronized thermostats: ${thermostatPairs.length}`
    if (invalidValveNames.length === 0) {
      this.setServiceStatus(syncInfo)
      return
    }
    this.setServiceStatus(
      `${syncInfo}; Not in external sensor mode: ${invalidValveNames.join(
        ', ',
      )}`,
      'yellow',
    )
  }
}

export default ThermostatController
