import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageBuilder } from '../builder.js'
import type { BuilderPayload } from '../types.js'

describe('MessageBuilder', () => {
  let captured: BuilderPayload | null
  let sendFn: (p: BuilderPayload) => void

  beforeEach(() => {
    captured = null
    sendFn = (p) => { captured = p }
  })

  it('returns this from data()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.data({ x: 1 })).toBe(b)
  })

  it('returns this from code()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.code('const x = 1')).toBe(b)
  })

  it('returns this from spoiler()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.spoiler('secret')).toBe(b)
  })

  it('returns this from expand()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.expand()).toBe(b)
  })

  it('returns this from button()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.button('Click', 'https://example.com')).toBe(b)
  })

  it('returns this from copyButton()', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    expect(b.copyButton('Copy', 'content')).toBe(b)
  })

  it('send() calls sendFn exactly once', () => {
    const spy = vi.fn()
    const b = new MessageBuilder('error', 'crash', spy)
    b.data({ foo: 'bar' }).send()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('send() passes accumulated payload', () => {
    const b = new MessageBuilder('error', 'crash', sendFn)
    b.data({ userId: 42 }).code('stack trace', 'typescript').spoiler('secret').expand().send()
    expect(captured).not.toBeNull()
    expect(captured!.level).toBe('error')
    expect(captured!.label).toBe('crash')
    expect(captured!.data).toEqual({ userId: 42 })
    expect(captured!.codeBlock).toEqual({ content: 'stack trace', language: 'typescript' })
    expect(captured!.spoilerFields).toContain('secret')
    expect(captured!.expandData).toBe(true)
  })

  it('no .send() = sendFn never called', () => {
    const spy = vi.fn()
    const _b = new MessageBuilder('log', 'no-send', spy)
    // intentionally no .send()
    expect(spy).not.toHaveBeenCalled()
  })

  it('button(text, url) shorthand creates url button', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    b.button('Go', 'https://example.com').send()
    expect(captured!.buttons).toEqual([{ text: 'Go', url: 'https://example.com' }])
  })

  it('copyButton() creates copy custom button', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    b.copyButton('Copy it', 'the text').send()
    expect(captured!.buttons).toEqual([{ text: 'Copy it', copy: 'the text' }])
  })

  it('button(preset) adds preset string', () => {
    const b = new MessageBuilder('error', 'test', sendFn)
    b.button('claude' as const).send()
    expect(captured!.buttons).toContain('claude')
  })

  it('chaining multiple buttons accumulates them', () => {
    const b = new MessageBuilder('log', 'test', sendFn)
    b.button('Open', 'https://a.com').copyButton('Copy', 'data').send()
    expect(captured!.buttons).toHaveLength(2)
  })
})
