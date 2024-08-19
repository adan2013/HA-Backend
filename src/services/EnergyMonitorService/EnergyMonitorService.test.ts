import EnergyMonitorService from './EnergyMonitorService'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'
import { DeviceStatistics, EnergyMonitorServiceData } from './types'

jest.mock('../../configs/energyMonitor.config', () => [
  {
    currentPowerEntityId: 'powerEntityId',
    totalEnergyEntityId: 'energyEntityId',
    deviceName: 'Smart plug',
    runtimePowerThreshold: 15,
    runtimeOnDelay: 10,
    runtimeOffDelay: 5,
  },
])

const updatePowerValue = (v: number) =>
  emitStateUpdate('powerEntityId', v.toString())

const updateEnergyValue = (v: number) =>
  emitStateUpdate('energyEntityId', v.toString())

const getMonitorState = (s: EnergyMonitorService): DeviceStatistics =>
  (s.getServiceData() as EnergyMonitorServiceData).monitors[0]

describe('Energy monitor service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-07-29T12:00:00Z'))
    mockEntity('powerEntityId', '0.6')
    mockEntity('energyEntityId', '42.05')
  })

  it('should initialize service with correct status and state', () => {
    const service = new EnergyMonitorService()
    expect(service.getServiceStatus().status).toEqual({
      message: 'On watchlist: 1',
      color: 'green',
      enabled: true,
    })
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 42.05,
        monthly: 0,
        daily: 0,
        runtime: 0,
      },
      initialValues: {
        inThisMonth: 42.05,
        inThisDay: 42.05,
        inThisRuntime: 42.05,
      },
    })
  })

  it('should save the new energy value to all the counters', () => {
    const service = new EnergyMonitorService()
    updateEnergyValue(45.2)
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 45.2,
        monthly: 3.15,
        daily: 3.15,
        runtime: 3.15,
      },
      initialValues: {
        inThisMonth: 42.05,
        inThisDay: 42.05,
        inThisRuntime: 42.05,
      },
    })
  })

  it('should reset the daily counter at midnight', () => {
    const service = new EnergyMonitorService()
    updateEnergyValue(100)
    jest.advanceTimersByTime(1000 * 60 * 60 * 24)
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 100,
        monthly: 57.95,
        daily: 0,
        runtime: 57.95,
      },
      initialValues: {
        inThisMonth: 42.05,
        inThisDay: 100,
        inThisRuntime: 42.05,
      },
    })
  })

  it('should reset the monthly counter at the beginning of the month', () => {
    const service = new EnergyMonitorService()
    updateEnergyValue(100)
    jest.advanceTimersByTime(1000 * 60 * 60 * 24 * 3)
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 100,
        monthly: 0,
        daily: 0,
        runtime: 57.95,
      },
      initialValues: {
        inThisMonth: 100,
        inThisDay: 100,
        inThisRuntime: 42.05,
      },
    })
  })

  it('should reset the runtime counter after turning on the device', () => {
    const service = new EnergyMonitorService()
    updatePowerValue(20)
    jest.advanceTimersByTime(15000)
    updateEnergyValue(100)
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 100,
        monthly: 57.95,
        daily: 57.95,
        runtime: 57.95,
      },
      initialValues: {
        inThisMonth: 42.05,
        inThisDay: 42.05,
        inThisRuntime: 42.05,
      },
    })

    updatePowerValue(4)
    jest.advanceTimersByTime(2000)
    updatePowerValue(20)
    expect(getMonitorState(service).consumedEnergy.runtime).toBe(57.95)
    expect(getMonitorState(service).initialValues.inThisRuntime).toBe(42.05)

    updatePowerValue(4)
    jest.advanceTimersByTime(10000)
    expect(getMonitorState(service).consumedEnergy.runtime).toBe(57.95)
    expect(getMonitorState(service).initialValues.inThisRuntime).toBe(42.05)

    updatePowerValue(20)
    jest.advanceTimersByTime(20000)
    expect(getMonitorState(service).consumedEnergy.runtime).toBe(0)
    expect(getMonitorState(service).initialValues.inThisRuntime).toBe(100)

    updateEnergyValue(101.23)
    expect(getMonitorState(service).consumedEnergy.runtime).toBe(1.23)
    expect(getMonitorState(service).initialValues.inThisRuntime).toBe(100)
  })

  it('should ignore entity updates when the service is disabled', () => {
    const service = new EnergyMonitorService()
    service.setServiceEnabled(false)
    updatePowerValue(20)
    updateEnergyValue(100)
    expect(getMonitorState(service)).toEqual({
      deviceName: 'Smart plug',
      consumedEnergy: {
        total: 42.05,
        monthly: 0,
        daily: 0,
        runtime: 0,
      },
      initialValues: {
        inThisMonth: 42.05,
        inThisDay: 42.05,
        inThisRuntime: 42.05,
      },
    })
  })
})
