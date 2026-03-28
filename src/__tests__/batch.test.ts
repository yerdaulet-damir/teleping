import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BatchManager } from '../batch.js'
import type { Message } from '../types.js'

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    level: 'success',
    label: 'new user',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('BatchManager', () => {
  let flushCalls: [string, number, string][]
  let batch: BatchManager

  beforeEach(() => {
    vi.useFakeTimers()
    flushCalls = []
    batch = new BatchManager((label, count, level) => {
      flushCalls.push([label, count, level])
    }, 5000) // 5 second window for testing
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('first event returns send', () => {
    expect(batch.add(makeMsg())).toBe('send')
  })

  it('second event with same key returns batched', () => {
    batch.add(makeMsg())
    expect(batch.add(makeMsg())).toBe('batched')
  })

  it('different labels are independent', () => {
    batch.add(makeMsg({ label: 'a' }))
    expect(batch.add(makeMsg({ label: 'b' }))).toBe('send')
  })

  it('different levels are independent', () => {
    batch.add(makeMsg({ level: 'success', label: 'x' }))
    expect(batch.add(makeMsg({ level: 'warn', label: 'x' }))).toBe('send')
  })

  it('errors always return send, never batch', () => {
    expect(batch.add(makeMsg({ level: 'error' }))).toBe('send')
    expect(batch.add(makeMsg({ level: 'error' }))).toBe('send')
    expect(batch.add(makeMsg({ level: 'error' }))).toBe('send')
  })

  it('flushes batch summary after window expires when count > 1', () => {
    batch.add(makeMsg())
    batch.add(makeMsg())
    batch.add(makeMsg())

    expect(flushCalls).toHaveLength(0)
    vi.advanceTimersByTime(5000)
    expect(flushCalls).toHaveLength(1)
    expect(flushCalls[0]).toEqual(['new user', 3, 'success'])
  })

  it('does not flush if only one event (already sent)', () => {
    batch.add(makeMsg())
    vi.advanceTimersByTime(5000)
    expect(flushCalls).toHaveLength(0)
  })

  it('flushAll sends pending batches immediately', () => {
    batch.add(makeMsg())
    batch.add(makeMsg())
    batch.flushAll()
    expect(flushCalls).toHaveLength(1)
    expect(flushCalls[0]).toEqual(['new user', 2, 'success'])
  })

  it('flushAll clears the store', () => {
    batch.add(makeMsg())
    expect(batch.size).toBe(1)
    batch.flushAll()
    expect(batch.size).toBe(0)
  })

  it('tracks size correctly', () => {
    expect(batch.size).toBe(0)
    batch.add(makeMsg({ label: 'a' }))
    expect(batch.size).toBe(1)
    batch.add(makeMsg({ label: 'b' }))
    expect(batch.size).toBe(2)
    batch.add(makeMsg({ label: 'a' })) // batched into existing
    expect(batch.size).toBe(2)
  })
})
