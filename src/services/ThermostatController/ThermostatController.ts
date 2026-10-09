import Service from '../Service'
import RadiatorMonitorHelper from '../../helpers/RadiatorMonitorHelper'
import thermostatPairs from '../../configs/thermostat.config'

const EXTERNAL_TEMPERATURE_PRECISION = 1
export const TEMPERATURE_RESEND_AFTER_MINUTES = 30

class ThermostatController extends Service {
  constructor() {
    super('thermostatController')
    thermostatPairs.forEach((pair) => {
      this.registerHelper(
        new RadiatorMonitorHelper({
          name: pair.name,
          thermometerEntityId: pair.thermometerEntityId,
          externalTemperatureEntityId:
            pair.radiatorValveExternalTemperatureEntityId,
          temperatureSensorEntityId:
            pair.radiatorValveTemperatureSensorEntityId,
          resendAfterMinutes: TEMPERATURE_RESEND_AFTER_MINUTES,
          precision: EXTERNAL_TEMPERATURE_PRECISION,
        }),
      )
    })
    this.setServiceStatus(`Monitored radiators: ${thermostatPairs.length}`)
  }
}

export default ThermostatController
