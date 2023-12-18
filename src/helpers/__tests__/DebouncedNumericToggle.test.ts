import DebouncedNumericToggle, { ToggleConfig } from '../DebouncedNumericToggle'

jest.useFakeTimers()

describe('DebouncedNumericToggle', () => {
  const getToggle = (config: Partial<ToggleConfig> = {}) =>
    new DebouncedNumericToggle({
      name: 'test',
      threshold: 10,
      onDelay: 100,
      offDelay: 100,
      ...config,
    })

  it('should set correct default state and helper status', () => {
    const toggle = getToggle({
      defaultState: 'switching-on',
    })
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Switching on...',
      color: 'blue',
    })
  })

  it('should switch on after some delay and go back to off state', () => {
    const toggle = getToggle()
    toggle.inputValue(11)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Switching on...',
      color: 'blue',
    })
    jest.advanceTimersByTime(101)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Toggle is on',
      color: 'green',
    })
    jest.advanceTimersByTime(500)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Toggle is on',
      color: 'green',
    })
    toggle.inputValue(9)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Switching off...',
      color: 'blue',
    })
    jest.advanceTimersByTime(101)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Toggle is off',
      color: 'red',
    })
  })

  it('should not switch to ON state if the value dropped off below threshold', () => {
    const onCallback = jest.fn()
    const offCallback = jest.fn()
    const toggle = getToggle({
      onToggleOn: onCallback,
      onToggleOff: offCallback,
    })
    toggle.inputValue(11)
    jest.advanceTimersByTime(90)
    toggle.inputValue(9)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Toggle is off',
      color: 'red',
    })
    jest.advanceTimersByTime(500)
    expect(onCallback).not.toHaveBeenCalled()
    expect(offCallback).not.toHaveBeenCalled()
  })

  it('should not switch to OFF state if the value got up above threshold', () => {
    const onCallback = jest.fn()
    const offCallback = jest.fn()
    const toggle = getToggle({
      onToggleOn: onCallback,
      onToggleOff: offCallback,
      defaultState: 'on',
    })
    toggle.inputValue(9)
    jest.advanceTimersByTime(90)
    toggle.inputValue(11)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Toggle is on',
      color: 'green',
    })
    jest.advanceTimersByTime(500)
    expect(onCallback).not.toHaveBeenCalled()
    expect(offCallback).not.toHaveBeenCalled()
  })

  it('should trigger on and off callbacks only after state change', () => {
    const onCallback = jest.fn()
    const offCallback = jest.fn()
    const toggle = getToggle({
      onToggleOn: onCallback,
      onToggleOff: offCallback,
    })
    toggle.inputValue(11)
    jest.advanceTimersByTime(101)
    expect(onCallback).toHaveBeenCalledTimes(1)
    expect(offCallback).not.toHaveBeenCalled()
    toggle.inputValue(9)
    jest.advanceTimersByTime(90)
    toggle.inputValue(11)
    expect(onCallback).toHaveBeenCalledTimes(1)
    expect(offCallback).not.toHaveBeenCalled()
    toggle.inputValue(9)
    jest.advanceTimersByTime(101)
    expect(onCallback).toHaveBeenCalledTimes(1)
    expect(offCallback).toHaveBeenCalledTimes(1)
    toggle.inputValue(11)
    jest.advanceTimersByTime(90)
    toggle.inputValue(9)
    expect(onCallback).toHaveBeenCalledTimes(1)
    expect(offCallback).toHaveBeenCalledTimes(1)
  })
})
