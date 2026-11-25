import ValueHelper from '../ValueHelper'

describe('ValueHelper', () => {
  afterEach(() => jest.useRealTimers())

  it('keeps an unread value distinct from zero and preserves raw types', () => {
    const balance = new ValueHelper<number>('balance')
    expect(balance.getHelperStatus().value).toBeNull()
    balance.setValue(0)
    expect(balance.getHelperStatus().value).toBe(0)
    const version = new ValueHelper('version', '1.0.0')
    expect(version.getHelperStatus().value).toBe('1.0.0')
  })

  it('preserves the last successful reading and timestamp on error', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-23T03:00:00Z'))
    const helper = new ValueHelper<number>('balance', 21.37)
    jest.advanceTimersByTime(24 * 60 * 60 * 1000)
    helper.setError('Sendly unavailable')
    expect(helper.getHelperStatus()).toMatchObject({
      value: 21.37,
      updatedAt: '2026-11-23T03:00:00.000Z',
      error: 'Sendly unavailable',
      color: 'red',
    })
    helper.setValue(0.05)
    expect(helper.getHelperStatus()).toMatchObject({
      value: 0.05,
      updatedAt: '2026-11-24T03:00:00.000Z',
      error: null,
      color: 'green',
    })
  })
})
