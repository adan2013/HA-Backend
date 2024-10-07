import LivingRoomController from './LivingRoomController'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { serviceCall } from '../../events/events'
import { ServiceCallPayload } from '../../events/eventPayloads'
import Entities from '../../configs/entities.config'

const lrLights = Entities.light.livingRoom

const setLight = (id: string, lvl: number) => {
  emitStateUpdate(id, lvl > 0 ? 'on' : 'off', { brightness: lvl })
}

const pressButton = (v: string) => {
  emitStateUpdate(Entities.sensor.remote.livingRoom, v)
  emitStateUpdate(Entities.sensor.remote.livingRoom, 'None')
}

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

const init = () => {
  const serviceCallMock = jest.fn()
  serviceCall.on(serviceCallMock)
  new LivingRoomController()
  return serviceCallMock
}

describe('LivingRoomController', () => {
  beforeEach(() => {
    mockEntity(Entities.sensor.remote.livingRoom, 'None')
    mockEntity(lrLights.table, 'off')
    mockEntity(lrLights.tv, 'off')
    mockEntity(lrLights.ceilingBackSection, 'off')
    mockEntity(lrLights.ceilingFrontSection, 'off')
  })

  afterEach(() => {
    serviceCall.resetListeners()
  })

  it('should turn off all ligths on button 6', () => {
    const serviceCallMock = init()
    pressButton('button_6_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(
      offPayload([
        lrLights.table,
        lrLights.tv,
        lrLights.ceilingBackSection,
        lrLights.ceilingFrontSection,
        lrLights.cabinet,
      ]),
    )
  })

  it('should turn on back and turn off front section on button 1', () => {
    const serviceCallMock = init()
    pressButton('button_1_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expect(serviceCallMock).toBeCalledWith(
      onPayload([lrLights.ceilingBackSection], 160),
    )
    expect(serviceCallMock).toBeCalledWith(
      offPayload([lrLights.ceilingFrontSection]),
    )
  })

  it('should turn on back and front section on button 2', () => {
    const serviceCallMock = init()
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(
      onPayload(
        [lrLights.ceilingFrontSection, lrLights.ceilingBackSection],
        160,
      ),
    )
  })

  it('should turn on tv light on button 3', () => {
    const serviceCallMock = init()
    pressButton('button_3_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(onPayload([lrLights.tv], 255))
  })

  it('should turn on table light on button 4', () => {
    const serviceCallMock = init()
    pressButton('button_4_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(onPayload([lrLights.table], 90))
  })

  it('should switch table light between levels and turn off if is already on this level', () => {
    const serviceCallMock = init()
    pressButton('button_4_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload([lrLights.table], 90),
    )
    setLight(lrLights.table, 90)
    pressButton('button_4_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload([lrLights.table], 160),
    )
    setLight(lrLights.table, 160)
    pressButton('button_4_hold')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload([lrLights.table], 255),
    )
    setLight(lrLights.table, 255)
    pressButton('button_4_hold')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      offPayload([lrLights.table]),
    )
  })

  it('should switch main light between levels and turn off if is already on this level', () => {
    const serviceCallMock = init()
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        [lrLights.ceilingFrontSection, lrLights.ceilingBackSection],
        160,
      ),
    )
    setLight(lrLights.ceilingFrontSection, 159)
    setLight(lrLights.ceilingBackSection, 161)
    pressButton('button_2_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        [lrLights.ceilingFrontSection, lrLights.ceilingBackSection],
        80,
      ),
    )
    setLight(lrLights.ceilingFrontSection, 79)
    setLight(lrLights.ceilingBackSection, 80)
    pressButton('button_2_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      offPayload([lrLights.ceilingFrontSection, lrLights.ceilingBackSection]),
    )
  })

  it('should switch main light between back and full section', () => {
    const serviceCallMock = init()
    pressButton('button_1_single')
    expect(serviceCallMock).toHaveBeenCalledWith(
      onPayload([lrLights.ceilingBackSection], 160),
    )
    expect(serviceCallMock).toHaveBeenCalledWith(
      offPayload([lrLights.ceilingFrontSection]),
    )
    setLight(lrLights.ceilingBackSection, 161)
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        [lrLights.ceilingFrontSection, lrLights.ceilingBackSection],
        160,
      ),
    )
    setLight(lrLights.ceilingFrontSection, 159)
    setLight(lrLights.ceilingBackSection, 161)
    serviceCallMock.mockReset()
    pressButton('button_1_single')
    // turn on back and turn off front section even if the back section has correct brightness level
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expect(serviceCallMock).toHaveBeenCalledWith(
      onPayload([lrLights.ceilingBackSection], 160),
    )
    expect(serviceCallMock).toHaveBeenCalledWith(
      offPayload([lrLights.ceilingFrontSection]),
    )
  })
})
