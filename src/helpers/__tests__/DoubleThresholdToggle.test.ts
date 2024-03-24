import DoubleThresholdToggle, {
  DoubleThresholdToggleConfig,
} from '../DoubleThresholdToggle'

describe('DoubleThresholdToggle', () => {
  const getToggle = (config: Partial<DoubleThresholdToggleConfig> = {}) =>
    new DoubleThresholdToggle({
      name: 'test',
      upperThreshold: 100,
      lowerThreshold: 75,
      ...config,
    })

  it('should set correct default state and helper status', () => {
    const toggle = getToggle()
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Last received value: 0 | State: unknown',
      color: 'none',
    })
  })

  it('should set correct helper status and trigger onChange callback', () => {
    const onChange = jest.fn()
    const toggle = getToggle({ onChange })

    toggle.inputValue(100)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Last received value: 100 | State: above',
      color: 'green',
    })
    expect(onChange).toHaveBeenLastCalledWith('above')

    toggle.inputValue(75)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Last received value: 75 | State: below',
      color: 'green',
    })
    expect(onChange).toHaveBeenLastCalledWith('below')

    toggle.inputValue(88)
    expect(toggle.getHelperStatus()).toEqual({
      message: 'Last received value: 88 | State: between',
      color: 'yellow',
    })
    expect(onChange).toHaveBeenLastCalledWith('between')

    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('should not trigger onChange callback if state is the same', () => {
    const onChange = jest.fn()
    const toggle = getToggle({ onChange })

    toggle.inputValue(90)
    expect(onChange).toHaveBeenCalledTimes(1)

    toggle.inputValue(90)
    expect(onChange).toHaveBeenCalledTimes(1)

    toggle.inputValue(4)
    expect(onChange).toHaveBeenCalledTimes(2)

    toggle.inputValue(4)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('should return correct last value and current state', () => {
    const toggle = getToggle()
    expect(toggle.getLastValue()).toEqual(0)
    expect(toggle.getCurrentState()).toEqual('unknown')
    toggle.inputValue(55)
    expect(toggle.getLastValue()).toEqual(55)
    expect(toggle.getCurrentState()).toEqual('below')
  })
})
