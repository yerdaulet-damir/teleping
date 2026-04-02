import { describe, expect, it } from 'vitest'
import { buildCardPayload, buildChecklistPayload, buildProgressPayload, buildTablePayload } from '../components.js'

const TS = 1700000000000

describe('buildCardPayload', () => {
  it('uses title as label', () => {
    const p = buildCardPayload({ title: 'New User' }, TS)
    expect(p.label).toBe('New User')
  })

  it('defaults to log level', () => {
    const p = buildCardPayload({ title: 'X' }, TS)
    expect(p.level).toBe('log')
  })

  it('respects custom level', () => {
    const p = buildCardPayload({ title: 'Payment', level: 'success' }, TS)
    expect(p.level).toBe('success')
  })

  it('includes subtitle and fields in data', () => {
    const p = buildCardPayload({ title: 'User', subtitle: 'Premium', fields: { email: 'a@b.com' } }, TS)
    expect(p.data).toBeDefined()
    expect(p.data!['subtitle']).toBe('Premium')
    expect(p.data!['email']).toBe('a@b.com')
  })

  it('data is undefined when no subtitle or fields', () => {
    const p = buildCardPayload({ title: 'X' }, TS)
    expect(p.data).toBeUndefined()
  })

  it('passes actions as buttons', () => {
    const p = buildCardPayload({ title: 'X', actions: [{ text: 'Go', url: 'https://x.com' }] }, TS)
    expect(p.buttons).toHaveLength(1)
  })
})

describe('buildProgressPayload', () => {
  it('produces log level', () => {
    const p = buildProgressPayload('Import', { current: 5, total: 10 }, TS)
    expect(p.level).toBe('log')
  })

  it('includes progress bar in data', () => {
    const p = buildProgressPayload('Import', { current: 5, total: 10 }, TS)
    expect(p.data!['progress']).toContain('5/10')
    expect(p.data!['progress']).toContain('50%')
  })

  it('includes unit when provided', () => {
    const p = buildProgressPayload('Import', { current: 5, total: 10, unit: 'rows' }, TS)
    expect(p.data!['progress']).toContain('rows')
  })

  it('handles 100% progress', () => {
    const p = buildProgressPayload('Done', { current: 10, total: 10 }, TS)
    expect(p.data!['progress']).toContain('100%')
    expect(String(p.data!['progress'])).toContain('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓')
  })
})

describe('buildTablePayload', () => {
  it('uses title as label', () => {
    const p = buildTablePayload('Stats', [], TS)
    expect(p.label).toBe('Stats')
  })

  it('returns empty payload for empty rows', () => {
    const p = buildTablePayload('Stats', [], TS)
    expect(p.codeBlock).toBeUndefined()
  })

  it('renders rows into code block', () => {
    const rows = [
      { metric: 'DAU', value: 1247 },
      { metric: 'MRR', value: 4820 },
    ]
    const p = buildTablePayload('Stats', rows, TS)
    expect(p.codeBlock).toBeDefined()
    expect(p.codeBlock!.content).toContain('DAU')
    expect(p.codeBlock!.content).toContain('1247')
    expect(p.codeBlock!.content).toContain('MRR')
  })

  it('includes column headers', () => {
    const p = buildTablePayload('T', [{ col1: 'a', col2: 'b' }], TS)
    expect(p.codeBlock!.content).toContain('col1')
    expect(p.codeBlock!.content).toContain('col2')
  })
})

describe('buildChecklistPayload', () => {
  it('uses title as label', () => {
    const p = buildChecklistPayload('Deploy', [], TS)
    expect(p.label).toBe('Deploy')
  })

  it('maps done items to ✅ and pending to ⬜', () => {
    const p = buildChecklistPayload('Deploy', [
      { label: 'Tests', done: true },
      { label: 'Migrate', done: false },
    ], TS)
    expect(p.data!['Tests']).toBe('✅')
    expect(p.data!['Migrate']).toBe('⬜')
  })

  it('preserves all items', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ label: `Step ${i}`, done: i % 2 === 0 }))
    const p = buildChecklistPayload('Steps', items, TS)
    expect(Object.keys(p.data!)).toHaveLength(5)
  })
})
