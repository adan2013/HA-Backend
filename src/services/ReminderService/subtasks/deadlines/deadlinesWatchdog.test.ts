import { notifications } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'

describe('deadlines watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEntity('input_datetime.kitchenfilterservice', '2023-02-15')
    mockEntity('input_datetime.kitchenmembranefilterservice', '2023-02-14')
    mockEntity('input_datetime.kitchenfinalfilterservice', '2023-02-13')
  })

  it('should disable deadline notification', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-05-05'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })

  it('should show deadline notification only for prefilters', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-09-14'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'water prefilters',
    })
  })

  it('should show deadline notification for all 3 inspections', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2024-08-01'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo:
        'water prefilters, membrane water filter, mineralization water filter',
    })
  })

  it('should refresh notification state on deadline date change', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-09-14'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'water prefilters',
    })
    emitStateUpdate('input_datetime.kitchenfilterservice', '2023-09-14')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })

  it('should not trigger deadline notification if entity is unavaliable', () => {
    mockEntity('input_datetime.kitchenfilterservice', 'unavailable')
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-09-14'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })
})
