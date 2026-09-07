import { MAX_LOG_EVENT_BYTES, prepareLogEvent } from './logger'

describe('logger', () => {
  it('serializes errors and circular data', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    const event = prepareLogEvent('error', 'Test', 'Failed', {
      error: new Error('boom'),
      circular,
    })

    expect(event.details).toMatchObject({
      error: { name: 'Error', message: 'boom' },
      circular: { self: '[Circular]' },
    })
  })

  it('limits the serialized event size', () => {
    const event = prepareLogEvent('info', 'Test', 'Large event', {
      payload: 'a'.repeat(MAX_LOG_EVENT_BYTES * 2),
    })
    const serialized = JSON.stringify({
      time: new Date().toISOString(),
      level: 'info',
      scope: 'Test',
      ...event,
    })

    expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(
      MAX_LOG_EVENT_BYTES,
    )
    expect(event.truncated).toBe(true)
  })
})
