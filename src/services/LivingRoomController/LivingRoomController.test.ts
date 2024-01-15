import LivingRoomController from './LivingRoomController'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { serviceCall } from '../../events/events'
import { ServiceCallPayload } from '../../events/eventPayloads'

const setLight = (id: string, lvl: number) => {
  emitStateUpdate(id, lvl > 0 ? 'on' : 'off', { brightness: lvl })
}

const pressButton = (v: string) => {
  emitStateUpdate('sensor.livingroomremote_action', v)
  emitStateUpdate('sensor.livingroomremote_action', 'None')
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
    mockEntity('sensor.livingroomremote_action', 'None')
    mockEntity('light.tablelight', 'off')
    mockEntity('light.tvlight', 'off')
    mockEntity('light.livingroombacklight', 'off')
    mockEntity('light.livingroomfrontlight', 'off')
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
        'light.tablelight',
        'light.tvlight',
        'light.livingroombacklight',
        'light.livingroomfrontlight',
      ]),
    )
  })

  it('should turn on back and turn off front section on button 1', () => {
    const serviceCallMock = init()
    pressButton('button_1_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expect(serviceCallMock).toBeCalledWith(
      onPayload(['light.livingroombacklight'], 160),
    )
    expect(serviceCallMock).toBeCalledWith(
      offPayload(['light.livingroomfrontlight']),
    )
  })

  it('should turn on back and front section on button 2', () => {
    const serviceCallMock = init()
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(
      onPayload(
        ['light.livingroomfrontlight', 'light.livingroombacklight'],
        160,
      ),
    )
  })

  it('should turn on tv light on button 3', () => {
    const serviceCallMock = init()
    pressButton('button_3_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(onPayload(['light.tvlight'], 255))
  })

  it('should turn on table light on button 4', () => {
    const serviceCallMock = init()
    pressButton('button_4_single')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expect(serviceCallMock).toBeCalledWith(onPayload(['light.tablelight'], 90))
  })

  it('should switch table light between levels and turn off if is already on this level', () => {
    const serviceCallMock = init()
    pressButton('button_4_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(['light.tablelight'], 90),
    )
    setLight('light.tablelight', 90)
    pressButton('button_4_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(['light.tablelight'], 160),
    )
    setLight('light.tablelight', 160)
    pressButton('button_4_hold')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(['light.tablelight'], 255),
    )
    setLight('light.tablelight', 255)
    pressButton('button_4_hold')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      offPayload(['light.tablelight']),
    )
  })

  it('should switch main light between levels and turn off if is already on this level', () => {
    const serviceCallMock = init()
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        ['light.livingroomfrontlight', 'light.livingroombacklight'],
        160,
      ),
    )
    setLight('light.livingroomfrontlight', 159)
    setLight('light.livingroombacklight', 161)
    pressButton('button_2_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        ['light.livingroomfrontlight', 'light.livingroombacklight'],
        80,
      ),
    )
    setLight('light.livingroomfrontlight', 79)
    setLight('light.livingroombacklight', 80)
    pressButton('button_2_double')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      offPayload(['light.livingroomfrontlight', 'light.livingroombacklight']),
    )
  })

  it('should switch main light between back and full section', () => {
    const serviceCallMock = init()
    pressButton('button_1_single')
    expect(serviceCallMock).toHaveBeenCalledWith(
      onPayload(['light.livingroombacklight'], 160),
    )
    expect(serviceCallMock).toHaveBeenCalledWith(
      offPayload(['light.livingroomfrontlight']),
    )
    setLight('light.livingroombacklight', 161)
    pressButton('button_2_single')
    expect(serviceCallMock).toHaveBeenLastCalledWith(
      onPayload(
        ['light.livingroomfrontlight', 'light.livingroombacklight'],
        160,
      ),
    )
    setLight('light.livingroomfrontlight', 159)
    setLight('light.livingroombacklight', 161)
    serviceCallMock.mockReset()
    pressButton('button_1_single')
    // turn on back and turn off front section even if the back section has correct brightness level
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expect(serviceCallMock).toHaveBeenCalledWith(
      onPayload(['light.livingroombacklight'], 160),
    )
    expect(serviceCallMock).toHaveBeenCalledWith(
      offPayload(['light.livingroomfrontlight']),
    )
  })
})
