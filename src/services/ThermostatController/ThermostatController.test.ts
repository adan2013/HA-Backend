import ThermostatController, {
  TEMPERATURE_RESEND_AFTER_MINUTES,
} from './ThermostatController'
import thermostatPairs from '../../configs/thermostat.config'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import {
  entityStateRequest,
  entityUpdate,
  serviceCall,
} from '../../events/events'
import Entities from '../../configs/entities.config'

describe('ThermostatController', () => {
  let serviceCallMock: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T12:43:00Z'))
    entityStateRequest.resetListeners()
    thermostatPairs.forEach((pair) => {
      entityUpdate(pair.thermometerEntityId).resetListeners()
      entityUpdate(
        pair.radiatorValveExternalTemperatureEntityId,
      ).resetListeners()
      entityUpdate(pair.radiatorValveTemperatureSensorEntityId).resetListeners()
    })
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

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('should register a monitor for every thermostat pair', () => {
    const service = new ThermostatController()
    const { status, helpers } = service.getServiceStatus()
    expect(status).toEqual({
      message: 'Monitored radiators: 3',
      color: 'green',
    })
    expect(Object.keys(helpers)).toEqual([
      'radiatorMonitor/aniaRoom',
      'radiatorMonitor/danielRoom',
      'radiatorMonitor/livingRoom',
    ])
    thermostatPairs.forEach((pair, i) => {
      const helper = helpers[`radiatorMonitor/${pair.name}`]
      expect(helper.color).toBe('green')
      expect(helper.message).toContain(`Room: 2${i}.4°C`)
      expect(helper.message).toContain('Sensor: external (room thermometer)')
      expect(helper.message).toContain('Next resend: 13:13 08-10-2026')
    })
  })

  it('should report sensor warnings only in the relevant helper', () => {
    const service = new ThermostatController()
    const modeId = thermostatPairs[1].radiatorValveTemperatureSensorEntityId
    emitStateUpdate(modeId, 'external_2')
    const { status, helpers } = service.getServiceStatus()
    expect(status).toEqual({
      message: 'Monitored radiators: 3',
      color: 'green',
    })
    expect(helpers['radiatorMonitor/danielRoom'].color).toBe('yellow')
    expect(helpers['radiatorMonitor/danielRoom'].message).toContain(
      'fallback to built-in sensor',
    )
    expect(helpers['radiatorMonitor/aniaRoom'].color).toBe('green')
    emitStateUpdate(modeId, 'external_3')
    expect(
      service.getServiceStatus().helpers['radiatorMonitor/danielRoom'].color,
    ).toBe('green')
    expect(serviceCallMock).toHaveBeenCalledTimes(3)
  })

  it('should independently renew inactivity timers for each radiator', () => {
    new ThermostatController()
    jest.advanceTimersByTime(10 * 60000)
    emitStateUpdate(thermostatPairs[1].thermometerEntityId, '23')
    expect(serviceCallMock).toHaveBeenCalledTimes(4)
    jest.advanceTimersByTime((TEMPERATURE_RESEND_AFTER_MINUTES - 10) * 60000)
    expect(serviceCallMock).toHaveBeenCalledTimes(6)
    expect(
      serviceCallMock.mock.calls.slice(4).map(([call]) => call.entityId),
    ).toEqual([
      thermostatPairs[0].radiatorValveExternalTemperatureEntityId,
      thermostatPairs[2].radiatorValveExternalTemperatureEntityId,
    ])
    jest.advanceTimersByTime(10 * 60000)
    expect(serviceCallMock).toHaveBeenCalledTimes(7)
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        entityId: thermostatPairs[1].radiatorValveExternalTemperatureEntityId,
        data: { value: 23 },
      }),
    )
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
    expect(helpers['radiatorMonitor/danielRoom'].color).toBe('red')
    expect(helpers['radiatorMonitor/danielRoom'].message).toContain(
      'Radiator is unavailable',
    )
    expect(helpers['radiatorMonitor/aniaRoom'].color).toBe('green')
    expect(helpers['radiatorMonitor/livingRoom'].color).toBe('green')
  })
})
