import Service from '../Service'
import Entity from '../../entities/Entity'
import waterLeakSensors from '../../configs/waterLeak.config'
import { notifications } from '../../events/events'
import HomeAssistantEntity from '../../entities/HomeAssistantEntity'
import Entities from '../../configs/entities.config'

class WaterLeakService extends Service {
  private waterLeakToggle = Entity.toggle(
    Entities.inputBoolean.security.waterLeakMonitoring,
  )
  private sensorEntities: HomeAssistantEntity[]
  private triggeredSensorNames: string[] = []

  constructor() {
    super('waterLeak')
    this.sensorEntities = waterLeakSensors.map((s) =>
      Entity.general(s.entityId),
    )
    this.waterLeakToggle.onChange(() => this.checkWaterLeaks())
    this.sensorEntities.forEach((se) =>
      se.onAnyStateUpdate(() => this.checkWaterLeaks()),
    )
    this.checkWaterLeaks()
  }

  private checkWaterLeaks() {
    if (this.isDisabled) return
    const currentlyDetectedNames: string[] = []
    waterLeakSensors.forEach((sensor) => {
      const entity = this.sensorEntities.find(
        (e) => e.entityId === sensor.entityId,
      )
      if (entity?.isOn) {
        currentlyDetectedNames.push(sensor.name)
      }
    })
    if (this.triggeredSensorNames.length === 0) {
      this.triggeredSensorNames = currentlyDetectedNames
    }
    if (this.waterLeakToggle.isOff) {
      this.triggeredSensorNames = []
    }
    notifications.emit({
      id: 'waterLeak',
      enabled: this.triggeredSensorNames.length > 0,
      extraInfo: this.triggeredSensorNames.join(', '),
    })
    this.setServiceStatus(
      `Sensor count: ${this.sensorEntities.length}; Leak detected: ${
        currentlyDetectedNames.length > 0
      }; Alarm: ${this.triggeredSensorNames.length > 0}`,
      this.triggeredSensorNames.length > 0 ? 'red' : 'green',
    )
  }
}

export default WaterLeakService
