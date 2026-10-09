import RadiatorMonitorHelper, {
  RadiatorMonitorConfig,
} from '../RadiatorMonitorHelper'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import {
  entityStateRequest,
  entityUpdate,
  serviceCall,
} from '../../events/events'

const thermometerId = 'sensor.room_temperature'
const inputId = 'number.radiator_external_temperature'
const modeId = 'select.radiator_temperature_sensor'
const entityIds = [thermometerId, inputId, modeId]
const minute = 60000

describe('RadiatorMonitorHelper', () => {
  let serviceCallMock: jest.Mock

  const getHelper = (config: Partial<RadiatorMonitorConfig> = {}) =>
    new RadiatorMonitorHelper({
      name: 'test',
      thermometerEntityId: thermometerId,
      externalTemperatureEntityId: inputId,
      temperatureSensorEntityId: modeId,
      resendAfterMinutes: 30,
      ...config,
    })

  const expectSentValue = (value: number) =>
    expect(serviceCallMock).toHaveBeenLastCalledWith({
      entityId: inputId,
      domain: 'number',
      service: 'set_value',
      data: { value },
    })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T12:43:00Z'))
    entityStateRequest.resetListeners()
    entityIds.forEach((id) => entityUpdate(id).resetListeners())
    serviceCall.resetListeners()
    serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity(thermometerId, '22.53')
    mockEntity(inputId, '20')
    mockEntity(modeId, 'external')
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('sends on start and reports temperature, input, mode and resend timing', () => {
    const helper = getHelper()
    expect(helper.name).toBe('radiatorMonitor/test')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expectSentValue(22.5)
    const { message, color } = helper.getHelperStatus()
    expect(color).toBe('green')
    expect(message).toContain('Room: 22.5°C | Radiator input: 20')
    expect(message).toContain('Sensor: external (room thermometer)')
    expect(message).toContain('Last sent: 22.5°C | Sent at: 12:43 08-10-2026')
    expect(message).toContain(
      'Resend after: 30 min idle | Next resend: 13:13 08-10-2026',
    )
    emitStateUpdate(inputId, '22.5')
    expect(helper.getHelperStatus().message).toContain('Radiator input: 22.5')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
  })

  it('repeats an unchanged temperature only after the configured idle interval', () => {
    const helper = getHelper({ resendAfterMinutes: 10 })
    jest.advanceTimersByTime(10 * minute - 1)
    emitStateUpdate(thermometerId, '22.54')
    emitStateUpdate(inputId, '22.5')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1)
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expectSentValue(22.5)
    expect(helper.getHelperStatus().message).toContain(
      'Sent at: 12:53 08-10-2026',
    )
    jest.advanceTimersByTime(10 * minute)
    expect(serviceCallMock).toHaveBeenCalledTimes(3)
  })

  it('restarts inactivity timing after a changed temperature, but not after unchanged reports', () => {
    const helper = getHelper()
    jest.advanceTimersByTime(20 * minute)
    emitStateUpdate(thermometerId, '23.17')
    expectSentValue(23.2)
    expect(helper.getHelperStatus().message).toContain(
      'Next resend: 13:33 08-10-2026',
    )
    jest.advanceTimersByTime(10 * minute)
    emitStateUpdate(thermometerId, '23.21')
    emitStateUpdate(inputId, '23.2')
    emitStateUpdate(modeId, 'external_3')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    jest.advanceTimersByTime(20 * minute)
    expect(serviceCallMock).toHaveBeenCalledTimes(3)
    expectSentValue(23.2)
  })

  it('does not send recursively when the target immediately echoes a write', () => {
    serviceCall.on(() => emitStateUpdate(inputId, '22.5'))
    getHelper()
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(30 * minute)
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['external', 'green', 'room thermometer'],
    ['external_3', 'green', 'room thermometer restored'],
    ['external_2', 'yellow', 'fallback to built-in sensor'],
    ['internal', 'yellow', 'built-in sensor'],
    ['remote_temperature', 'green', 'room thermometer'],
    ['remote_source_offline', 'yellow', 'fallback to built-in sensor'],
    ['local_temperature', 'yellow', 'built-in sensor'],
    ['unexpected', 'yellow', 'unrecognized mode'],
    ['unavailable', 'red', 'unavailable'],
    ['unknown', 'red', 'unavailable'],
  ])(
    'reports sensor mode %s without changing its selection',
    (mode, color, description) => {
      const helper = getHelper()
      emitStateUpdate(modeId, mode)
      expect(helper.getHelperStatus().color).toBe(color)
      expect(helper.getHelperStatus().message).toContain(description)
      expect(serviceCallMock).toHaveBeenCalledTimes(1)
      emitStateUpdate(modeId, 'external_3')
      expect(helper.getHelperStatus().color).toBe('green')
    },
  )

  it.each(['unavailable', 'unknown', 'abc', '', ' ', 'Infinity', '-1', '100'])(
    'pauses sends for invalid or unavailable room temperature %s, then resumes',
    (state) => {
      const helper = getHelper()
      emitStateUpdate(thermometerId, state)
      jest.advanceTimersByTime(60 * minute)
      expect(serviceCallMock).toHaveBeenCalledTimes(1)
      expect(helper.getHelperStatus().color).toBe('red')
      expect(helper.getHelperStatus().message).toContain('Sync paused:')
      expect(helper.getHelperStatus().message).toContain('Last sent: 22.5°C')
      emitStateUpdate(thermometerId, '22.53')
      expect(serviceCallMock).toHaveBeenCalledTimes(2)
      expectSentValue(22.5)
      expect(helper.getHelperStatus().color).toBe('green')
    },
  )

  it('pauses while the radiator is unavailable and resends the current value on recovery', () => {
    const helper = getHelper()
    emitStateUpdate(inputId, 'unavailable')
    emitStateUpdate(thermometerId, '21')
    jest.advanceTimersByTime(60 * minute)
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(helper.getHelperStatus().color).toBe('red')
    expect(helper.getHelperStatus().message).toContain(
      'Radiator is unavailable',
    )
    emitStateUpdate(inputId, '20')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expectSentValue(21)
    expect(helper.getHelperStatus().color).toBe('green')
  })

  it('waits for available entities on start and preserves mode warnings after recovery', () => {
    mockEntity(inputId, 'unknown')
    mockEntity(modeId, 'internal')
    const helper = getHelper()
    expect(serviceCallMock).not.toHaveBeenCalled()
    expect(helper.getHelperStatus().message).toContain('Last sent: never')
    expect(helper.getHelperStatus().color).toBe('red')
    emitStateUpdate(inputId, '20')
    expectSentValue(22.5)
    expect(helper.getHelperStatus().color).toBe('yellow')
  })

  it('supports a custom temperature precision', () => {
    getHelper({ precision: 2 })
    expectSentValue(22.53)
  })

  it.each([0, -1, NaN, Infinity, 40000])(
    'rejects invalid resend interval %s',
    (resendAfterMinutes) => {
      expect(() => getHelper({ resendAfterMinutes })).toThrow('Resend interval')
      expect(serviceCallMock).not.toHaveBeenCalled()
    },
  )

  it.each([-1, 0.5, NaN, Infinity, 101])(
    'rejects invalid precision %s',
    (precision) => {
      expect(() => getHelper({ precision })).toThrow('Precision')
    },
  )
})
