import { entityStateRequest, serviceCall } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import KitchenController from './KitchenController'
import { ServiceCallPayload } from '../../events/eventPayloads'

jest.useFakeTimers()

const offPayload = (id: string | string[]): ServiceCallPayload => ({
  entityId: id,
  domain: 'light',
  service: 'turn_off',
})

const onPayload = (id: string | string[], lvl: number): ServiceCallPayload => ({
  entityId: id,
  domain: 'light',
  service: 'turn_on',
  data: {
    brightness: lvl,
  },
})

const togglePayload = (id: string): ServiceCallPayload => ({
  entityId: id,
  domain: 'input_boolean',
  service: 'toggle',
})

const ids = {
  remote: 'sensor.kitchenremote_action',
  light: 'sensor.kitchenmotionsensor_illuminance_lux',
  motion: 'binary_sensor.kitchenmotionsensor_occupancy',
  leftLight: 'light.kitchenleftlight',
  rightLight: 'light.kitchenrightlight',
  autoLights: 'input_boolean.kitchenautolights',
  ignoreSun: 'input_boolean.kitchenignoresunposition',
  leftToggle: 'input_boolean.kitchenleftlighton',
  rightToggle: 'input_boolean.kitchenrightlighton',
}

const pressButton = (btn: string) => {
  emitStateUpdate(ids.remote, btn)
  emitStateUpdate(ids.remote, 'None')
}

interface ScenarioConfig {
  isDark?: boolean
  movement?: boolean
  autoLights?: boolean
  ignoreSun?: boolean
  leftToggle?: boolean
  rightToggle?: boolean
}

const init = ({
  isDark = false,
  movement = false,
  autoLights = true,
  ignoreSun = false,
  leftToggle = false,
  rightToggle = false,
}: ScenarioConfig = {}) => {
  entityStateRequest.resetListeners()
  mockEntity(ids.remote, 'None')
  mockEntity(ids.light, isDark ? '30' : '80')
  mockEntity(ids.motion, movement ? 'on' : 'off')
  mockEntity(ids.leftLight, 'off')
  mockEntity(ids.rightLight, 'off')
  mockEntity(ids.autoLights, autoLights ? 'on' : 'off')
  mockEntity(ids.ignoreSun, ignoreSun ? 'on' : 'off')
  mockEntity(ids.leftToggle, leftToggle ? 'on' : 'off')
  mockEntity(ids.rightToggle, rightToggle ? 'on' : 'off')
  const serviceCallMock = jest.fn()
  serviceCall.on(serviceCallMock)
  const controller = new KitchenController()
  return { serviceCallMock, controller }
}

describe('kitchenController', () => {
  afterEach(() => {
    serviceCall.resetListeners()
  })

  it('should initialize kitchen controller and set off state', () => {
    const { controller } = init()
    expect(controller.name).toBe('kitchenController')
    expect(controller.state.currentState).toBe('off')
  })

  it('should turn on the lights manually and turn them off with remote', () => {
    const { controller, serviceCallMock } = init()
    serviceCallMock.mockReset()

    emitStateUpdate(ids.leftToggle, 'on')
    expect(controller.state.currentState).toBe('manual')
    expect(serviceCallMock).toBeCalledTimes(2)
    expect(serviceCallMock).toBeCalledWith(onPayload(ids.leftLight, 255))
    expect(serviceCallMock).toBeCalledWith(offPayload(ids.rightLight))

    emitStateUpdate(ids.rightToggle, 'on')
    expect(controller.state.currentState).toBe('manual')
    expect(serviceCallMock).toBeCalledTimes(4)
    expect(serviceCallMock).toBeCalledWith(onPayload(ids.leftLight, 255))
    expect(serviceCallMock).toBeCalledWith(onPayload(ids.rightLight, 255))

    pressButton('button_3_single')
    expect(controller.state.currentState).toBe('disabled')
    expect(serviceCallMock).toBeCalledWith(
      offPayload([ids.leftLight, ids.rightLight]),
    )
    expect(serviceCallMock).toBeCalledWith({
      entityId: ids.leftToggle,
      domain: 'input_boolean',
      service: 'turn_off',
    })
    expect(serviceCallMock).toBeCalledWith({
      entityId: ids.rightToggle,
      domain: 'input_boolean',
      service: 'turn_off',
    })

    jest.advanceTimersByTime(7000)
    expect(controller.state.currentState).toBe('off')
  })

  it('should turn on auto lights when movement detected', () => {
    const { controller, serviceCallMock } = init({
      isDark: true,
      movement: true,
    })
    expect(controller.state.currentState).toBe('auto-on')
    expect(serviceCallMock).toBeCalledWith(
      onPayload([ids.leftLight, ids.rightLight], 255),
    )
    emitStateUpdate(ids.motion, 'off')
    expect(controller.state.currentState).toBe('auto-dimming')
    expect(serviceCallMock).toBeCalledWith(
      onPayload([ids.leftLight, ids.rightLight], 130),
    )
    jest.advanceTimersByTime(7000)
    expect(controller.state.currentState).toBe('off')
    expect(serviceCallMock).toBeCalledWith(
      offPayload([ids.leftLight, ids.rightLight]),
    )
  })

  it('should turn off auto lights if manual lights were enabled', () => {
    const { controller } = init({
      isDark: true,
      movement: true,
    })
    expect(controller.state.currentState).toBe('auto-on')
    emitStateUpdate(ids.leftToggle, 'off')
    expect(controller.state.currentState).toBe('auto-on')
    emitStateUpdate(ids.rightToggle, 'on')
    expect(controller.state.currentState).toBe('manual')
    emitStateUpdate(ids.rightToggle, 'off')
    expect(controller.state.currentState).toBe('auto-on')
  })

  it('should turn on auto lights if is dark or ignoreSun is on', () => {
    const isDarkCase = init({
      isDark: true,
      movement: true,
    })
    const ignoreSunCase = init({
      isDark: false,
      ignoreSun: true,
      movement: true,
    })
    const isBrightCase = init({
      isDark: false,
      movement: true,
    })
    expect(isDarkCase.controller.state.currentState).toBe('auto-on')
    expect(ignoreSunCase.controller.state.currentState).toBe('auto-on')
    expect(isBrightCase.controller.state.currentState).toBe('off')
  })

  it('should turn on auto lights only if it is getting dark', () => {
    const { controller } = init({
      isDark: false,
      movement: true,
    })
    expect(controller.state.currentState).toBe('off')
    emitStateUpdate(ids.light, '20')
    expect(controller.state.currentState).toBe('auto-on')
    emitStateUpdate(ids.light, '100')
    expect(controller.state.currentState).toBe('auto-on')
  })

  it('should disable auto lights if autoLight toggle is off', () => {
    const { controller } = init({
      isDark: true,
      movement: true,
      autoLights: false,
    })
    expect(controller.state.currentState).toBe('off')
  })

  it('should update state on autoLight or ignoreSun toggle change', () => {
    const { controller } = init({
      isDark: false,
      movement: true,
      autoLights: false,
      ignoreSun: true,
    })
    expect(controller.state.currentState).toBe('off')
    emitStateUpdate(ids.autoLights, 'on')
    expect(controller.state.currentState).toBe('auto-on')
    emitStateUpdate(ids.ignoreSun, 'off')
    expect(controller.state.currentState).toBe('off')
  })

  it('should ignore all the triggers if state is disabled', () => {
    const { controller } = init({
      isDark: true,
      movement: true,
    })
    expect(controller.state.currentState).toBe('auto-on')
    pressButton('button_3_single')
    expect(controller.state.currentState).toBe('disabled')
    emitStateUpdate(ids.light, '5')
    emitStateUpdate(ids.motion, 'off')
    emitStateUpdate(ids.autoLights, 'off')
    emitStateUpdate(ids.ignoreSun, 'on')
    emitStateUpdate(ids.leftToggle, 'on')
    emitStateUpdate(ids.rightToggle, 'on')
    expect(controller.state.currentState).toBe('disabled')
    jest.advanceTimersByTime(7000)
    expect(controller.state.currentState).toBe('off')
  })

  it('should trigger correct services after pressing the remote buttons', () => {
    const { controller, serviceCallMock } = init()
    pressButton('button_1_single')
    expect(serviceCallMock).toBeCalledWith(togglePayload(ids.rightToggle))
    pressButton('button_2_double')
    expect(serviceCallMock).toBeCalledWith(togglePayload(ids.leftToggle))
    pressButton('button_3_triple')
    expect(controller.state.currentState).toBe('disabled')
    expect(serviceCallMock).toBeCalledWith(
      offPayload([ids.leftLight, ids.rightLight]),
    )
    pressButton('button_4_single')
    expect(serviceCallMock).toBeCalledWith(togglePayload(ids.ignoreSun))
    pressButton('button_4_hold')
    expect(serviceCallMock).toBeCalledWith(togglePayload(ids.autoLights))
  })
})
