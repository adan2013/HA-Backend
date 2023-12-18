import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import Entity from '../Entity'
import { serviceCall } from '../../events/events'

mockEntity('sensor', 'on', {
  brightness: 130,
  color_temp_kelvin: 5000,
  min_color_temp_kelvin: 3000,
  max_color_temp_kelvin: 7000,
})

describe('LightEntity', () => {
  it('should create an instance add fetch the entity state', () => {
    const monoEntity = Entity.monoLight('sensor')
    const cctEntity = Entity.cctLight('sensor')
    const rgbEntity = Entity.rgbLight('sensor')
    expect(monoEntity).toBeDefined()
    expect(cctEntity).toBeDefined()
    expect(rgbEntity).toBeDefined()
    expect(monoEntity.state?.state).toBe('on')
    expect(cctEntity.state?.state).toBe('on')
    expect(rgbEntity.state?.state).toBe('on')
  })

  it('should return correct attribute values', () => {
    const entity = Entity.cctLight('sensor')
    expect(entity.brightness).toBe(130)
    expect(entity.temperatureInKelvins).toBe(5000)
    expect(entity.kelvinTemperatureRange).toEqual([3000, 7000])
  })

  it('should call the correct service', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const entity = Entity.monoLight('sensor')
    entity.turnOn(40)
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'light',
      service: 'turn_on',
      data: {
        brightness: 40,
      },
    })
    entity.turnOff()
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'light',
      service: 'turn_off',
    })
    entity.toggle()
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'light',
      service: 'toggle',
    })
  })

  it('should call turn_on or turn_off service depending on brightness', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    const entity = Entity.monoLight('sensor')
    entity.setBrightness(0)
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'light',
      service: 'turn_off',
    })
    entity.setBrightness(123)
    expect(serviceCallMock).toHaveBeenCalledWith({
      entityId: 'sensor',
      domain: 'light',
      service: 'turn_on',
      data: {
        brightness: 123,
      },
    })
  })

  it('should call correct services depends on the light type', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('sensor', 'unavailable')
    const monoEntity = Entity.monoLight('sensor')
    const cctEntity = Entity.cctLight('sensor')
    const rgbEntity = Entity.rgbLight('sensor')
    const entities = [monoEntity, cctEntity, rgbEntity]
    entities.forEach((e) => {
      e.setTemperature(3000)
      e.setColor(15, 25, 35)
      e.setEffect('effect')
    })
    expect(serviceCallMock).not.toHaveBeenCalled()
    emitStateUpdate('sensor', 'on')
    entities.forEach((e) => e.setTemperature(3000))
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    entities.forEach((e) => e.setColor(15, 25, 35))
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    entities.forEach((e) => e.setEffect('effect'))
    expect(serviceCallMock).toHaveBeenCalledTimes(5)
  })

  it('should not call any service if entity is not available', () => {
    const serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity('sensor', 'unavailable')
    const entity = Entity.monoLight('sensor')
    entity.turnOn(40)
    entity.turnOff()
    entity.toggle()
    expect(serviceCallMock).not.toHaveBeenCalled()
  })

  it('should trigger callback if light has been turned on', () => {
    const callbackMock = jest.fn()
    const entity = Entity.monoLight('sensor')
    entity.onLightOn(callbackMock)
    emitStateUpdate('sensor', 'on')
    expect(callbackMock).toHaveBeenCalled()
  })

  it('should trigger callback if light has been turned off', () => {
    const callbackMock = jest.fn()
    const entity = Entity.monoLight('sensor')
    entity.onLightOff(callbackMock)
    emitStateUpdate('sensor', 'off')
    expect(callbackMock).toHaveBeenCalled()
  })
})
