import StateMachine from '../StateMachine'

type TestState = 's1' | 's2' | 's3'

jest.useFakeTimers()

describe('StateMachine', () => {
  it('should set the default state', () => {
    const sm = new StateMachine<TestState>('myName', 's3')
    expect(sm.currentState).toEqual('s3')
  })

  it('should call onStateChange callback with new and old state value', () => {
    const callback = jest.fn()
    const sm = new StateMachine<TestState>('myName', 's3', callback)
    expect(sm.currentState).toEqual('s3')
    expect(callback).not.toHaveBeenCalled()
    sm.setState('s2')
    expect(sm.currentState).toEqual('s2')
    expect(callback).toHaveBeenCalledWith('s2', 's3')
  })

  it('should set correct helper status', () => {
    const sm = new StateMachine<TestState>('myName', 's3')
    expect(sm.getHelperStatus()).toEqual({
      message: 'State: s3',
      color: 'none',
    })
    sm.setState('s1')
    expect(sm.getHelperStatus()).toEqual({
      message: 'State: s1',
      color: 'none',
    })
  })

  it('should reset state after delay', () => {
    const sm = new StateMachine<TestState>('myName', 's3', undefined, [
      { from: 's3', to: 's2', delay: 50 },
      { from: 's2', to: 's1', delay: 50 },
      { from: 's1', to: 's3', delay: 100 },
    ])
    sm.setState('s2')
    expect(sm.currentState).toEqual('s2')
    jest.advanceTimersByTime(60)
    expect(sm.currentState).toEqual('s1')
    jest.advanceTimersByTime(110)
    expect(sm.currentState).toEqual('s3')
    jest.advanceTimersByTime(60)
    expect(sm.currentState).toEqual('s2')
  })

  it('should not reset state if state is changed', () => {
    const sm = new StateMachine<TestState>('myName', 's3', undefined, [
      { from: 's2', to: 's1', delay: 100 },
    ])
    sm.setState('s2')
    jest.advanceTimersByTime(90)
    sm.setState('s2')
    jest.advanceTimersByTime(90)
    expect(sm.currentState).toEqual('s2')
    jest.advanceTimersByTime(110)
    expect(sm.currentState).toEqual('s1')
  })
})
