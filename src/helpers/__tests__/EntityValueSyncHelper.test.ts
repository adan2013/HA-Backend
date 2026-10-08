import EntityValueSyncHelper, {
  EntityValueSyncConfig,
} from '../EntityValueSyncHelper'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { serviceCall } from '../../events/events'

const sourceId = 'sensor.source'
const targetId = 'number.target'

describe('EntityValueSyncHelper', () => {
  let serviceCallMock: jest.Mock

  const getHelper = (config: Partial<EntityValueSyncConfig> = {}) =>
    new EntityValueSyncHelper({
      name: 'test',
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      ...config,
    })

  const expectSyncedValue = (value: number) =>
    expect(serviceCallMock).toHaveBeenLastCalledWith({
      entityId: targetId,
      domain: 'number',
      service: 'set_value',
      data: { value },
    })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T12:43:00Z'))
    serviceCall.resetListeners()
    serviceCallMock = jest.fn()
    serviceCall.on(serviceCallMock)
    mockEntity(sourceId, '22.5')
    mockEntity(targetId, '20')
  })

  it('should sync the current value on start and show it in the status', () => {
    const helper = getHelper()
    expect(helper.name).toBe('entityValueSync/test')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    expectSyncedValue(22.5)
    expect(helper.getLastSyncedValue()).toBe(22.5)
    expect(helper.getHelperStatus()).toEqual({
      message: 'Last value: 22.5 | Synced at: 12:43 08-10-2026',
      color: 'green',
    })
  })

  it('should pass every new source value to the target', () => {
    const helper = getHelper()
    jest.setSystemTime(new Date('2026-10-08T13:05:00Z'))
    emitStateUpdate(sourceId, '23.1')
    expectSyncedValue(23.1)
    expect(helper.getHelperStatus()).toEqual({
      message: 'Last value: 23.1 | Synced at: 13:05 08-10-2026',
      color: 'green',
    })
  })

  it('should not send the same value twice', () => {
    getHelper()
    emitStateUpdate(sourceId, '22.5')
    emitStateUpdate(targetId, '22.5')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
  })

  it('should round the value according to the precision', () => {
    const helper = getHelper({ precision: 1 })
    emitStateUpdate(sourceId, '22.83')
    expectSyncedValue(22.8)
    emitStateUpdate(sourceId, '22.79')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expect(helper.getHelperStatus().message).toContain('Last value: 22.8 |')
  })

  it('should throw an error for negative precision', () => {
    expect(() => getHelper({ precision: -1 })).toThrow()
  })

  it('should set an error status when the source is unavailable', () => {
    const helper = getHelper()
    emitStateUpdate(sourceId, 'unavailable')
    expect(helper.getHelperStatus()).toEqual({
      message: 'Source entity is unavailable',
      color: 'red',
    })
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    emitStateUpdate(sourceId, '21')
    expectSyncedValue(21)
    expect(helper.getHelperStatus().color).toBe('green')
  })

  it('should set an error status when the source value is not a number', () => {
    const helper = getHelper()
    emitStateUpdate(sourceId, 'abc')
    expect(helper.getHelperStatus()).toEqual({
      message: 'Source value is not a number',
      color: 'red',
    })
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
  })

  it('should set an error status when the target is unavailable and resync after it is back', () => {
    const helper = getHelper()
    emitStateUpdate(targetId, 'unavailable')
    expect(helper.getHelperStatus()).toEqual({
      message: 'Target entity is unavailable',
      color: 'red',
    })
    emitStateUpdate(sourceId, '22.5')
    expect(serviceCallMock).toHaveBeenCalledTimes(1)
    emitStateUpdate(targetId, '20')
    expect(serviceCallMock).toHaveBeenCalledTimes(2)
    expectSyncedValue(22.5)
    expect(helper.getHelperStatus().color).toBe('green')
  })

  it('should not sync anything when entities are unavailable on start', () => {
    mockEntity(targetId, 'unknown')
    const helper = getHelper()
    expect(serviceCallMock).not.toHaveBeenCalled()
    expect(helper.getHelperStatus()).toEqual({
      message: 'Target entity is unavailable',
      color: 'red',
    })
  })
})
