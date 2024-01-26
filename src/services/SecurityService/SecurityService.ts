import Service from '../Service'
import Entity from '../../entities/Entity'
import { waterLeakSensors } from '../../configs/waterLeak.config'
import { notifications } from '../../events/events'

class SecurityService extends Service {
  private waterLeakToggle = Entity.toggle('input_boolean.alertwaterleak')
  constructor() {
    super('security')
    this.initWaterLeakProtection()
  }

  private initWaterLeakProtection() {
    const sensorEntities = waterLeakSensors.map((s) =>
      Entity.general(s.entityId),
    )
    const checkWaterLeak = () => {
      if (this.isDisabled) return
      const leakNames: string[] = []
      const offlineNames: string[] = []
      waterLeakSensors.forEach((sensor) => {
        const entity = sensorEntities.find(
          (e) => e.entityId === sensor.entityId,
        )
        if (entity) {
          if (entity.isUnavailable) {
            offlineNames.push(sensor.name)
          } else if (entity.isOn) {
            leakNames.push(sensor.name)
          }
        }
      })
      const protectionEnabled = this.waterLeakToggle.isOn
      const leakDetected = leakNames.length > 0
      const offlineSensorsDetected = offlineNames.length > 0
      notifications.emit({
        id: 'waterLeak',
        enabled: leakDetected && protectionEnabled,
        extraInfo: leakDetected ? leakNames.join(', ') : undefined,
      })
      notifications.emit({
        id: 'waterLeakOfflineSensor',
        enabled: offlineSensorsDetected && protectionEnabled,
        extraInfo: offlineSensorsDetected ? offlineNames.join(', ') : undefined,
      })
    }
    this.waterLeakToggle.onChange(() => checkWaterLeak())
    sensorEntities.forEach((se) => se.onAnyStateUpdate(() => checkWaterLeak()))
    checkWaterLeak()
  }
}

export default SecurityService
