import ReminderService from './ReminderService'
import { notifications, serviceCall } from '../../events/events'
import { emitStateUpdate, mockEntity } from '../../utils/testUtils'

describe('ReminderService', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEntity('sensor.washingmachineplug_power', '0.6')
    mockEntity('input_select.washingmachinestate', 'LOADED')
    mockEntity('input_datetime.kitchenfilterservice', '2023-02-15')
    mockEntity('input_datetime.kitchenmembranefilterservice', '2023-02-14')
    mockEntity('input_datetime.kitchenfinalfilterservice', '2023-02-13')
    mockEntity('input_boolean.alertdeadbolt', 'on')
    mockEntity('binary_sensor.maindoordeadboltsensor_contact', 'off')
  })

  describe('washing machine watchdog', () => {
    it('should reset state of the washing machine', () => {
      const serviceMock = jest.fn()
      serviceCall.on(serviceMock)
      new ReminderService()
      expect(serviceMock).toHaveBeenCalledWith({
        entityId: 'input_select.washingmachinestate',
        domain: 'input_select',
        service: 'select_option',
        data: {
          option: 'EMPTY',
        },
      })
    })

    it('should set correct washing machine state', () => {
      const serviceMock = jest.fn()
      serviceCall.on(serviceMock)
      new ReminderService()
      emitStateUpdate('sensor.washingmachineplug_power', '40')
      jest.advanceTimersByTime(65000)
      expect(serviceMock).toHaveBeenCalledWith({
        entityId: 'input_select.washingmachinestate',
        domain: 'input_select',
        service: 'select_option',
        data: {
          option: 'WORKING',
        },
      })
      emitStateUpdate('sensor.washingmachineplug_power', '1')
      jest.advanceTimersByTime(310000)
      expect(serviceMock).toHaveBeenCalledWith({
        entityId: 'input_select.washingmachinestate',
        domain: 'input_select',
        service: 'select_option',
        data: {
          option: 'LOADED',
        },
      })
    })

    it('should trigger notification on washing machine state change', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      new ReminderService()
      emitStateUpdate('input_select.washingmachinestate', 'WORKING')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'loadedWashingMachine',
        enabled: false,
      })
      emitStateUpdate('input_select.washingmachinestate', 'EMPTY')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'loadedWashingMachine',
        enabled: false,
      })
      emitStateUpdate('input_select.washingmachinestate', 'LOADED')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'loadedWashingMachine',
        enabled: true,
      })
    })
  })

  describe('water filter watchdog', () => {
    it('should disable water filter notification', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      jest.setSystemTime(new Date('2023-05-05'))
      new ReminderService()
      expect(notificationMock).toHaveBeenCalledWith({
        id: 'waterFilterInspection',
        enabled: false,
      })
    })

    it('should show water filter notification only for prefilters', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      jest.setSystemTime(new Date('2023-09-14'))
      new ReminderService()
      expect(notificationMock).toHaveBeenCalledWith({
        id: 'waterFilterInspection',
        enabled: true,
        extraInfo: 'two prefilters',
      })
    })

    it('should show water filter notification for all 3 inspections', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      jest.setSystemTime(new Date('2024-08-01'))
      new ReminderService()
      expect(notificationMock).toHaveBeenCalledWith({
        id: 'waterFilterInspection',
        enabled: true,
        extraInfo: 'two prefilters, membrane filter, mineralization filter',
      })
    })

    it('should refresh notification state on inspection date change', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      jest.setSystemTime(new Date('2023-09-14'))
      new ReminderService()
      expect(notificationMock).toHaveBeenCalledWith({
        id: 'waterFilterInspection',
        enabled: true,
        extraInfo: 'two prefilters',
      })
      emitStateUpdate('input_datetime.kitchenfilterservice', '2023-09-14')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'waterFilterInspection',
        enabled: false,
      })
    })
  })

  describe('main door deadbolt watchdog', () => {
    it('should show and hide the notification about the open main doors', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      new ReminderService()
      expect(notificationMock).toHaveBeenCalledWith({
        id: 'mainDoorOpen',
        enabled: false,
      })
      emitStateUpdate('binary_sensor.maindoordeadboltsensor_contact', 'on')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: true,
      })
      emitStateUpdate('binary_sensor.maindoordeadboltsensor_contact', 'unknown')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: false,
      })
      emitStateUpdate('binary_sensor.maindoordeadboltsensor_contact', 'off')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: false,
      })
    })

    it('should disable the main door notification if the toggle is off', () => {
      const notificationMock = jest.fn()
      notifications.on(notificationMock)
      new ReminderService()
      emitStateUpdate('binary_sensor.maindoordeadboltsensor_contact', 'on')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: true,
      })
      emitStateUpdate('input_boolean.alertdeadbolt', 'off')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: false,
      })
      emitStateUpdate('input_boolean.alertdeadbolt', 'on')
      expect(notificationMock).toHaveBeenLastCalledWith({
        id: 'mainDoorOpen',
        enabled: true,
      })
    })
  })
})
