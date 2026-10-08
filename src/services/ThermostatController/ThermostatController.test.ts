import ThermostatController from './ThermostatController'
import thermostatPairs from '../../configs/thermostat.config'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { serviceCall } from '../../events/events'
import Entities from '../../configs/entities.config'

describe('ThermostatController', () => {
  let serviceCallMock: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T12:43:00Z'))
    serviceCall.resetListeners()
    serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    thermostatPairs.forEach((pair, i) => {
      mockEntity(pair.thermometerEntityId, `2${i}.43`)
      mockEntity(pair.radiatorValveExternalTemperatureEntityId, '20')
      mockEntity(pair.radiatorValveTemperatureSensorEntityId, 'external')
    })
  })

  it('should pair every room thermometer with the radiator valve in the same room', () => {
    expect(thermostatPairs).toEqual([
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
    ])
  })

  it('should register a sync helper for every thermostat pair', () => {
    const service = new ThermostatController()
    expect(service.getServiceStatus()).toEqual({
      status: {
        message: 'Synchronized thermostats: 3',
        color: 'green',
      },
      helpers: {
        'entityValueSync/aniaRoom': {
          message: 'Last value: 20.4 | Synced at: 12:43 08-10-2026',
          color: 'green',
        },
        'entityValueSync/danielRoom': {
          message: 'Last value: 21.4 | Synced at: 12:43 08-10-2026',
          color: 'green',
        },
        'entityValueSync/livingRoom': {
          message: 'Last value: 22.4 | Synced at: 12:43 08-10-2026',
          color: 'green',
        },
      },
    })
  })

  it('should show a warning status when some radiator valves are not in the external sensor mode', () => {
    mockEntity(
      thermostatPairs[0].radiatorValveTemperatureSensorEntityId,
      'internal',
    )
    mockEntity(
      thermostatPairs[2].radiatorValveTemperatureSensorEntityId,
      'unavailable',
    )
    const service = new ThermostatController()
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Synchronized thermostats: 3; Not in external sensor mode: aniaRoom, livingRoom',
      color: 'yellow',
    })
  })

  it('should update the status when the sensor mode changes', () => {
    const service = new ThermostatController()
    const danielSensorModeId =
      thermostatPairs[1].radiatorValveTemperatureSensorEntityId
    emitStateUpdate(danielSensorModeId, 'internal')
    expect(service.getServiceStatus().status).toEqual({
      message:
        'Synchronized thermostats: 3; Not in external sensor mode: danielRoom',
      color: 'yellow',
    })
    emitStateUpdate(danielSensorModeId, 'external')
    expect(service.getServiceStatus().status).toEqual({
      message: 'Synchronized thermostats: 3',
      color: 'green',
    })
  })

  it('should send room temperatures to the external temperature inputs of radiator valves', () => {
    new ThermostatController()
    expect(serviceCallMock).toHaveBeenCalledTimes(3)
    const [pair] = thermostatPairs
    emitStateUpdate(pair.thermometerEntityId, '21.97')
    expect(serviceCallMock).toHaveBeenCalledTimes(4)
    expect(serviceCallMock).toHaveBeenLastCalledWith({
      entityId: pair.radiatorValveExternalTemperatureEntityId,
      domain: 'number',
      service: 'set_value',
      data: { value: 22 },
    })
  })

  it('should show an error only for the pair with an unavailable device', () => {
    const service = new ThermostatController()
    emitStateUpdate(
      thermostatPairs[1].radiatorValveExternalTemperatureEntityId,
      'unavailable',
    )
    const { helpers } = service.getServiceStatus()
    expect(helpers['entityValueSync/danielRoom']).toEqual({
      message: 'Target entity is unavailable',
      color: 'red',
    })
    expect(helpers['entityValueSync/aniaRoom'].color).toBe('green')
    expect(helpers['entityValueSync/livingRoom'].color).toBe('green')
  })
})
