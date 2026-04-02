import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Teleping } from '../pingr.js'

// ─── Mock fetch globally ──────────────────────────────────────────────────────

const fetchSpy = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ ok: true }),
})

vi.stubGlobal('fetch', fetchSpy)

function lastCallBody(): Record<string, unknown> {
  const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]
  return JSON.parse(lastCall?.[1]?.body ?? '{}') as Record<string, unknown>
}

function lastCallText(): string {
  return lastCallBody()['text'] as string
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Teleping', () => {
  let p: Teleping

  beforeEach(() => {
    fetchSpy.mockClear()
    vi.stubEnv('TELEPING_TOKEN', '')
    vi.stubEnv('TELEPING_CHAT', '')
    p = new Teleping()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ─── Config resolution ──────────────────────────────────────────────────

  describe('config', () => {
    it('reads from env vars', () => {
      vi.stubEnv('TELEPING_TOKEN', 'tok123')
      vi.stubEnv('TELEPING_CHAT', 'chat456')
      p = new Teleping()
      p.log('test').send()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const url = fetchSpy.mock.calls[0]![0] as string
      expect(url).toContain('bot' + 'tok123')
    })

    it('init() overrides env vars', () => {
      p.init({ token: 'manual_tok', chatId: 'manual_chat' })
      p.log('test').send()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const url = fetchSpy.mock.calls[0]![0] as string
      expect(url).toContain('botmanual_tok')
    })

    it('no-ops silently when no config (warns once)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      p.log('test1').send()
      p.log('test2').send()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      warnSpy.mockRestore()
    })
  })

  // ─── Five methods ───────────────────────────────────────────────────────

  describe('methods', () => {
    beforeEach(() => {
      p.init({ token: 'tok', chatId: 'chat' })
    })

    it('log sends with info emoji', () => {
      p.log('info msg').send()
      expect(lastCallText()).toContain('ℹ️')
      expect(lastCallText()).toContain('info msg')
    })

    it('success sends with check emoji', () => {
      p.success('payment received').send()
      expect(lastCallText()).toContain('✅')
      expect(lastCallText()).toContain('payment received')
    })

    it('warn sends with warning emoji', () => {
      p.warn('rate limit').send()
      expect(lastCallText()).toContain('⚠️')
    })

    it('error sends with red circle emoji', () => {
      p.error('crash').send()
      expect(lastCallText()).toContain('🔴')
    })

    it('metric sends with chart emoji and value', () => {
      p.metric('users', 147)
      expect(lastCallText()).toContain('📊')
      expect(lastCallText()).toContain('147')
    })

    it('includes data as key-value pairs', () => {
      p.success('new user', { email: 'a@b.com', plan: 'pro' })
      const text = lastCallText()
      expect(text).toContain('email: a@b.com')
      expect(text).toContain('plan: pro')
    })

    it('includes app name in footer', () => {
      p.init({ token: 'tok', chatId: 'chat', app: 'myapp.com' })
      p.log('test').send()
      expect(lastCallText()).toContain('myapp.com')
    })

    it('includes sent via teleping footer', () => {
      p.log('test').send()
      expect(lastCallText()).toContain('sent via teleping')
    })
  })

  // ─── Error buttons ──────────────────────────────────────────────────────

  describe('error buttons', () => {
    beforeEach(() => {
      p.init({ token: 'tok', chatId: 'chat' })
    })

    it('error messages include inline keyboard', () => {
      p.error('crash', { error: 'boom' })
      const body = lastCallBody()
      expect(body['reply_markup']).toBeDefined()
    })
  })

  // ─── Batching ───────────────────────────────────────────────────────────

  describe('batching', () => {
    beforeEach(() => {
      p.init({ token: 'tok', chatId: 'chat', batchWindowMs: 1000 })
    })

    it('first event sends immediately', () => {
      p.success('user signup').send()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('duplicate events within window are batched', () => {
      p.success('user signup').send()
      p.success('user signup').send()
      p.success('user signup').send()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('errors are never batched', () => {
      p.error('crash').send()
      p.error('crash').send()
      p.error('crash').send()
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    })
  })

  // ─── Digest ─────────────────────────────────────────────────────────────

  describe('digest', () => {
    beforeEach(() => {
      p.init({ token: 'tok', chatId: 'chat' })
    })

    it('sends accumulated stats', async () => {
      p.log('a').send()
      p.success('b').send()
      p.error('c').send()
      p.metric('users', 100)
      fetchSpy.mockClear()

      await p.digest()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const text = lastCallText()
      expect(text).toContain('Digest')
      expect(text).toContain('4 events')
    })

    it('does not send if no events', async () => {
      fetchSpy.mockClear()
      await p.digest()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('resets after sending', async () => {
      p.log('a').send()
      await p.digest()
      fetchSpy.mockClear()
      await p.digest()
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  // ─── Quiet hours ────────────────────────────────────────────────────────

  describe('quiet hours', () => {
    it('suppresses non-error during quiet hours', () => {
      const currentHour = new Date().getHours()
      p.init({
        token: 'tok',
        chatId: 'chat',
        quietStart: currentHour,
        quietEnd: (currentHour + 2) % 24,
      })
      p.log('quiet test').send()
      p.success('quiet success').send()
      p.warn('quiet warn').send()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('errors always go through during quiet hours', () => {
      const currentHour = new Date().getHours()
      p.init({
        token: 'tok',
        chatId: 'chat',
        quietStart: currentHour,
        quietEnd: (currentHour + 2) % 24,
      })
      p.error('critical crash').send()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })
})
