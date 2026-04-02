import { describe, expect, it } from 'vitest'
import { formatMessage } from '../format.js'
import { DEFAULT_THEME, THEMES } from '../themes.js'
import type { Message } from '../types.js'

const baseMsg: Message = {
  level: 'success',
  label: 'New user!',
  data: { email: 'alex@test.com', plan: 'pro' },
  timestamp: new Date('2025-01-15T14:23:00').getTime(),
}

// ─── Regression guard: DEFAULT_THEME output = v0.1 output ─────────────────────

describe('DEFAULT_THEME regression', () => {
  it('produces identical output to formatMessage with no opts', () => {
    const withoutOpts = formatMessage(baseMsg)
    const withDefaultTheme = formatMessage(baseMsg, undefined, { theme: DEFAULT_THEME })
    expect(withDefaultTheme.text).toBe(withoutOpts.text)
  })

  it('DEFAULT_THEME is minimal', () => {
    expect(DEFAULT_THEME).toBe(THEMES.minimal)
  })

  it('minimal uses flat data format', () => {
    expect(THEMES.minimal.dataFormat).toBe('flat')
  })

  it('rich uses expandable-blockquote data format', () => {
    expect(THEMES.rich.dataFormat).toBe('expandable-blockquote')
  })

  it('compact uses short separator', () => {
    expect(THEMES.compact.separator).toBe('·')
  })
})

// ─── Theme rendering ──────────────────────────────────────────────────────────

describe('theme rendering', () => {
  it('rich theme with expandData wraps data in blockquote', () => {
    const { text } = formatMessage(baseMsg, undefined, {
      theme: THEMES.rich,
      expandData: true,
    })
    expect(text).toContain('<blockquote expandable>')
  })

  it('compact theme does not bold the header', () => {
    const msg: Message = { level: 'log', label: 'ping', timestamp: Date.now() }
    const { text } = formatMessage(msg, undefined, { theme: THEMES.compact })
    expect(text).not.toContain('<b>ping</b>')
    expect(text).toContain('ping')
  })

  it('custom separator overrides theme separator', () => {
    const { text } = formatMessage(baseMsg, undefined, { separator: '---' })
    expect(text).toContain('---')
    expect(text).not.toContain('━━━━━━━━━━━━━━━━━━━━━')
  })

  it('custom emoji overrides level emoji', () => {
    const msg: Message = { level: 'error', label: 'fail', timestamp: Date.now() }
    const { text } = formatMessage(msg, undefined, { customEmoji: { error: '💥' } })
    expect(text).toContain('💥')
    expect(text).not.toContain('🔴')
  })

  it('footer option adds line above sent via teleping', () => {
    const { text } = formatMessage(baseMsg, undefined, { footer: 'myapp v2.1' })
    const footerIdx = text.indexOf('myapp v2.1')
    const svtIdx = text.indexOf('sent via teleping')
    expect(footerIdx).toBeGreaterThan(-1)
    expect(svtIdx).toBeGreaterThan(footerIdx)
  })

  it('codeBlock option adds pre/code section', () => {
    const { text } = formatMessage(baseMsg, undefined, { codeBlock: { content: 'const x = 1', language: 'typescript' } })
    expect(text).toContain('<pre><code')
    expect(text).toContain('const x = 1')
  })
})
