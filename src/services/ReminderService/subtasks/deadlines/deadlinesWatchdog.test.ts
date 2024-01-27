import { notifications } from '../../../../events/events'
import ReminderService from '../../ReminderService'
import { emitStateUpdate, mockEntity } from '../../../../utils/testUtils'

jest.mock('../../../../configs/deadline.config', () => [
  {
    label: 'label1',
    entityId: 'entity1',
    interval: 60,
    warningThreshold: 10,
  },
  {
    label: 'label2',
    entityId: 'entity2',
    interval: 30,
    warningThreshold: 2,
  },
])

describe('deadlines watchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEntity('entity1', '2023-02-15')
    mockEntity('entity2', '2023-02-20')
  })

  it('should disable deadline notification', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-02-25'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })

  it('should show deadline notification only for label2', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-03-20'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'label2',
    })
  })

  it('should show deadline notification for both labels', () => {
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2024-05-20'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'label1, label2',
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
      extraInfo: 'label1, label2',
    })
    emitStateUpdate('entity1', '2023-09-14')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'label2',
    })
    emitStateUpdate('entity2', '2023-09-14')
    expect(notificationMock).toHaveBeenLastCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })

  it('should not trigger deadline notification if entity is unavaliable', () => {
    mockEntity('entity1', 'unavailable')
    const notificationMock = jest.fn()
    notifications.on(notificationMock)
    jest.setSystemTime(new Date('2023-10-14'))
    new ReminderService()
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: true,
      extraInfo: 'label2',
    })
    emitStateUpdate('entity2', 'unavailable')
    expect(notificationMock).toHaveBeenCalledWith({
      id: 'deadlineWarning',
      enabled: false,
    })
  })
})
