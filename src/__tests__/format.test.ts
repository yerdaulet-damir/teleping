import { describe, expect, it } from 'vitest'
import { escapeHtml, formatBatch, formatDigest, formatMessage, parseStackFileLine } from '../format.js'
import type { DigestStats, Message } from '../types.js'

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes &, <, >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d')
  })

  it('returns plain strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

// ─── parseStackFileLine ───────────────────────────────────────────────────────

describe('parseStackFileLine', () => {
  it('extracts file and line from Node stack trace', () => {
    const stack = `Error: fail\n    at handler (src/payments.ts:47:12)\n    at process`
    expect(parseStackFileLine(stack)).toEqual({ file: 'src/payments.ts', line: 47 })
  })

  it('returns null for non-matching stacks', () => {
    expect(parseStackFileLine('no stack here')).toBeNull()
  })
})

// ─── formatMessage ────────────────────────────────────────────────────────────

describe('formatMessage', () => {
  const baseMsg: Message = {
    level: 'success',
    label: 'New user!',
    data: { email: 'alex@test.com', plan: 'pro' },
    timestamp: new Date('2025-01-15T14:23:00').getTime(),
  }

  it('includes emoji and label', () => {
    const { text } = formatMessage(baseMsg)
    expect(text).toContain('✅')
    expect(text).toContain('<b>New user!</b>')
  })

  it('includes data as key-value pairs', () => {
    const { text } = formatMessage(baseMsg)
    expect(text).toContain('email: alex@test.com')
    expect(text).toContain('plan: pro')
  })

  it('includes separator lines', () => {
    const { text } = formatMessage(baseMsg)
    expect(text).toContain('━━━━━━━━━━━━━━━━━━━━━')
  })

  it('includes sent via teleping footer', () => {
    const { text } = formatMessage(baseMsg)
    expect(text).toContain('<i>sent via teleping</i>')
  })

  it('includes app name when provided', () => {
    const { text } = formatMessage(baseMsg, 'myapp.com')
    expect(text).toContain('myapp.com')
  })

  it('includes time in footer', () => {
    const { text } = formatMessage(baseMsg)
    expect(text).toContain('14:23')
  })

  it('uses correct emoji per level', () => {
    const levels = [
      { level: 'log' as const, emoji: 'ℹ️' },
      { level: 'success' as const, emoji: '✅' },
      { level: 'warn' as const, emoji: '⚠️' },
      { level: 'error' as const, emoji: '🔴' },
      { level: 'metric' as const, emoji: '📊' },
    ]
    for (const { level, emoji } of levels) {
      const msg: Message = { level, label: 'test', timestamp: Date.now() }
      const { text } = formatMessage(msg)
      expect(text).toContain(emoji)
    }
  })

  it('handles metric with value', () => {
    const msg: Message = { level: 'metric', label: 'users', value: 147, timestamp: Date.now() }
    const { text } = formatMessage(msg)
    expect(text).toContain('📊')
    expect(text).toContain('<b>users</b>: 147')
  })

  it('handles message with no data', () => {
    const msg: Message = { level: 'log', label: 'ping', timestamp: Date.now() }
    const { text } = formatMessage(msg)
    expect(text).toContain('ℹ️')
    expect(text).toContain('<b>ping</b>')
    expect(text).toContain('<i>sent via teleping</i>')
  })

  it('adds buttons only for errors', () => {
    const successMsg: Message = { level: 'success', label: 'ok', timestamp: Date.now() }
    expect(formatMessage(successMsg).buttons).toEqual([])

    const errorMsg: Message = { level: 'error', label: 'fail', data: { error: 'boom' }, timestamp: Date.now() }
    expect(formatMessage(errorMsg).buttons.length).toBeGreaterThan(0)
  })

  it('adds Cursor button when stack trace in data', () => {
    const msg: Message = {
      level: 'error',
      label: 'crash',
      data: { stack: 'Error: x\n    at fn (src/app.ts:10:5)\n    at run' },
      timestamp: Date.now(),
    }
    const { buttons } = formatMessage(msg)
    const flat = buttons.flat()
    expect(flat.some(b => b.text.includes('Cursor'))).toBe(true)
  })

  it('truncates data with more than 20 entries', () => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < 25; i++) data[`key${i}`] = `val${i}`
    const msg: Message = { level: 'log', label: 'big', data, timestamp: Date.now() }
    const { text } = formatMessage(msg)
    expect(text).toContain('...and 5 more')
  })

  it('escapes HTML in label and data', () => {
    const msg: Message = { level: 'log', label: '<script>alert(1)</script>', data: { x: '<b>bold</b>' }, timestamp: Date.now() }
    const { text } = formatMessage(msg)
    expect(text).not.toContain('<script>')
    expect(text).toContain('&lt;script&gt;')
  })
})

// ─── formatBatch ──────────────────────────────────────────────────────────────

describe('formatBatch', () => {
  it('shows count and label', () => {
    const { text } = formatBatch('new user', 10, 'success')
    expect(text).toContain('10×')
    expect(text).toContain('new user')
    expect(text).toContain('✅')
  })

  it('includes sent via teleping', () => {
    const { text } = formatBatch('test', 3, 'log')
    expect(text).toContain('<i>sent via teleping</i>')
  })
})

// ─── formatDigest ─────────────────────────────────────────────────────────────

describe('formatDigest', () => {
  const stats: DigestStats = {
    log: 5, success: 10, warn: 2, error: 1, metric: 3,
    errors: ['payment failed'],
    metrics: [['users', 147], ['revenue', 500]],
  }

  it('shows total event count', () => {
    const { text } = formatDigest(stats)
    expect(text).toContain('21 events')
  })

  it('shows breakdown by level', () => {
    const { text } = formatDigest(stats)
    expect(text).toContain('✅ 10 success')
    expect(text).toContain('🔴 1 errors')
  })

  it('shows recent errors', () => {
    const { text } = formatDigest(stats)
    expect(text).toContain('payment failed')
  })

  it('shows metrics', () => {
    const { text } = formatDigest(stats)
    expect(text).toContain('users: 147')
    expect(text).toContain('revenue: 500')
  })

  it('includes sent via teleping', () => {
    const { text } = formatDigest(stats)
    expect(text).toContain('<i>sent via teleping</i>')
  })
})
