import { MessageBuilder } from './builder.js'
import { BatchManager } from './batch.js'
import { buildCardPayload, buildChecklistPayload, buildProgressPayload, buildTablePayload } from './components.js'
import { formatBatch, formatDigest, formatMessage, resolveButtonPresets, type FormatOptions } from './format.js'
import { sendMessage } from './send.js'
import { DEFAULT_THEME, THEMES } from './themes.js'
import type {
  BuilderPayload,
  ButtonSpec,
  CardOptions,
  ChecklistItem,
  DigestStats,
  Level,
  Message,
  ProgressOptions,
  TableRow,
  TelepingConfig,
} from './types.js'

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_BATCH_WINDOW_MS = 5 * 60 * 1000

// ─── Teleping class ───────────────────────────────────────────────────────────

export class Teleping {
  private config: TelepingConfig | null = null
  private resolved = false
  private warned = false
  private batchManager: BatchManager
  private digest_: DigestStats = freshDigest()

  constructor() {
    this.batchManager = new BatchManager(
      (label, count, level) => this.sendBatchSummary(label, count, level),
      DEFAULT_BATCH_WINDOW_MS
    )
  }

  /** Explicitly configure teleping. Overrides env vars. */
  init(opts: Partial<TelepingConfig>): void {
    const token = opts.token ?? process.env['TELEPING_TOKEN'] ?? ''
    const chatId = opts.chatId ?? process.env['TELEPING_CHAT'] ?? ''
    this.config = { token, chatId, ...opts }
    this.resolved = true
    this.warned = false

    if (opts.batchWindowMs !== undefined) {
      this.batchManager = new BatchManager(
        (label, count, level) => this.sendBatchSummary(label, count, level),
        opts.batchWindowMs
      )
    }
  }

  // ─── Public API (overloads) ────────────────────────────────────────────────

  log(label: string, data: Record<string, unknown>): void
  log(label: string): MessageBuilder
  log(label: string, data?: Record<string, unknown>): MessageBuilder | void {
    if (data !== undefined) { this.emit({ level: 'log', label, data, timestamp: Date.now() }); return }
    return this.makeBuilder('log', label)
  }

  success(label: string, data: Record<string, unknown>): void
  success(label: string): MessageBuilder
  success(label: string, data?: Record<string, unknown>): MessageBuilder | void {
    if (data !== undefined) { this.emit({ level: 'success', label, data, timestamp: Date.now() }); return }
    return this.makeBuilder('success', label)
  }

  warn(label: string, data: Record<string, unknown>): void
  warn(label: string): MessageBuilder
  warn(label: string, data?: Record<string, unknown>): MessageBuilder | void {
    if (data !== undefined) { this.emit({ level: 'warn', label, data, timestamp: Date.now() }); return }
    return this.makeBuilder('warn', label)
  }

  error(label: string, data: Record<string, unknown>): void
  error(label: string): MessageBuilder
  error(label: string, data?: Record<string, unknown>): MessageBuilder | void {
    if (data !== undefined) { this.emit({ level: 'error', label, data, timestamp: Date.now() }); return }
    return this.makeBuilder('error', label)
  }

  metric(label: string, value: number): void {
    this.emit({ level: 'metric', label, value, timestamp: Date.now() })
  }

  /** Send a digest summary of accumulated events, then reset. */
  async digest(): Promise<void> {
    const cfg = this.resolve()
    if (!cfg) return

    const total = this.digest_.log + this.digest_.success + this.digest_.warn + this.digest_.error + this.digest_.metric
    if (total === 0) return

    const { text } = formatDigest(this.digest_, cfg.app)
    await sendMessage({ token: cfg.token, chatId: cfg.chatId, text }).catch(this.logError)
    this.digest_ = freshDigest()
  }

  // ─── Component methods ────────────────────────────────────────────────────

  card(opts: CardOptions): void {
    const cfg = this.resolve()
    if (!cfg) return
    const payload = buildCardPayload(opts, Date.now())
    this.emitRich(payload, true)
  }

  progress(label: string, opts: ProgressOptions): void {
    const cfg = this.resolve()
    if (!cfg) return
    const payload = buildProgressPayload(label, opts, Date.now())
    this.emitRich(payload, true)
  }

  table(title: string, rows: TableRow[]): void {
    const cfg = this.resolve()
    if (!cfg) return
    const payload = buildTablePayload(title, rows, Date.now())
    this.emitRich(payload, true)
  }

  checklist(title: string, items: ChecklistItem[]): void {
    const cfg = this.resolve()
    if (!cfg) return
    const payload = buildChecklistPayload(title, items, Date.now())
    this.emitRich(payload, true)
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private makeBuilder(level: Level, label: string): MessageBuilder {
    // Eagerly resolve config so console.warn fires on missing credentials
    this.resolve()
    // Eagerly track digest (so digest() counts this event even without .send())
    this.trackDigest({ level, label, timestamp: Date.now() })
    return new MessageBuilder(level, label, (p) => this.emitRich(p, false))
  }

  private emit(msg: Message): void {
    const cfg = this.resolve()
    if (!cfg) return

    this.trackDigest(msg)
    if (msg.level !== 'error' && this.isQuietHour(cfg)) return

    const action = this.batchManager.add(msg)
    if (action === 'batched') return

    const { text, buttons } = formatMessage(msg, cfg.app, this.buildFormatOpts(msg.level, msg))
    const route = this.resolveRoute(msg.level)
    const emitArgs: Parameters<typeof sendMessage>[0] = { token: cfg.token, chatId: route.chatId, text, buttons }
    if (route.threadId !== undefined) emitArgs.threadId = route.threadId
    sendMessage(emitArgs).catch(this.logError)
  }

  /**
   * Core rich-message dispatcher. Used by builder .send() and component methods.
   * @param trackDigest - true for component methods (not yet tracked), false for builder (already tracked eagerly)
   */
  private emitRich(payload: BuilderPayload, trackDigest: boolean): void {
    const cfg = this.config
    if (!cfg) return

    const msg: Message = {
      level: payload.level,
      label: payload.label,
      data: payload.data,
      value: payload.value,
      timestamp: payload.timestamp,
    }

    if (trackDigest) this.trackDigest(msg)
    if (payload.level !== 'error' && this.isQuietHour(cfg)) return

    const action = this.batchManager.add(msg)
    if (action === 'batched') return

    const configButtons: ButtonSpec[] = cfg.buttons?.[payload.level] ?? cfg.buttons?.['default'] ?? []
    const allSpecs: ButtonSpec[] = [...configButtons, ...(payload.buttons ?? [])]
    const stack = typeof payload.data?.['stack'] === 'string' ? payload.data['stack'] : undefined

    const opts: FormatOptions = {
      theme: cfg.theme ? THEMES[cfg.theme] : DEFAULT_THEME,
      ...(cfg.separator !== undefined && { separator: cfg.separator }),
      ...(cfg.emoji !== undefined && { customEmoji: cfg.emoji }),
      ...(cfg.footer !== undefined && { footer: cfg.footer }),
      ...(payload.expandData !== undefined && { expandData: payload.expandData }),
      ...(payload.codeBlock !== undefined && { codeBlock: payload.codeBlock }),
      ...(payload.spoilerFields !== undefined && { spoilerFields: payload.spoilerFields }),
      ...(allSpecs.length > 0 && {
        overrideButtons: [resolveButtonPresets(allSpecs, {
          label: payload.label,
          ...(stack !== undefined && { stack }),
          ...(payload.data !== undefined && { data: payload.data }),
        })],
      }),
    }

    const { text, buttons } = formatMessage(msg, cfg.app, opts)
    const route = this.resolveRoute(payload.level)
    const routeArgs: Parameters<typeof sendMessage>[0] = { token: cfg.token, chatId: route.chatId, text, buttons }
    if (route.threadId !== undefined) routeArgs.threadId = route.threadId
    sendMessage(routeArgs).catch(this.logError)
  }

  private buildFormatOpts(level: Level, msg: Message): FormatOptions | undefined {
    const cfg = this.config
    if (!cfg) return undefined

    const configButtons: ButtonSpec[] = cfg.buttons?.[level] ?? cfg.buttons?.['default'] ?? []
    const hasRich = cfg.theme || cfg.separator || cfg.emoji || cfg.footer || configButtons.length > 0
    if (!hasRich) return undefined

    const stack = typeof msg.data?.['stack'] === 'string' ? msg.data['stack'] : undefined
    return {
      theme: cfg.theme ? THEMES[cfg.theme] : DEFAULT_THEME,
      ...(cfg.separator !== undefined && { separator: cfg.separator }),
      ...(cfg.emoji !== undefined && { customEmoji: cfg.emoji }),
      ...(cfg.footer !== undefined && { footer: cfg.footer }),
      ...(configButtons.length > 0 && {
        overrideButtons: [resolveButtonPresets(configButtons, {
          label: msg.label,
          ...(stack !== undefined && { stack }),
          ...(msg.data !== undefined && { data: msg.data }),
        })],
      }),
    }
  }

  private resolveRoute(level: Level): { chatId: string; threadId?: string } {
    const cfg = this.config
    if (!cfg) return { chatId: '' }
    const route = cfg.routes?.[level]
    const result: { chatId: string; threadId?: string } = { chatId: route?.chatId ?? cfg.chatId }
    if (route?.threadId !== undefined) result.threadId = route.threadId
    return result
  }

  private sendBatchSummary(label: string, count: number, level: Level): void {
    const cfg = this.resolve()
    if (!cfg) return
    const { text } = formatBatch(label, count, level, cfg.app)
    sendMessage({ token: cfg.token, chatId: cfg.chatId, text }).catch(this.logError)
  }

  private resolve(): TelepingConfig | null {
    if (this.resolved) return this.config

    const token = process.env['TELEPING_TOKEN']
    const chatId = process.env['TELEPING_CHAT']

    this.resolved = true

    if (!token || !chatId) {
      if (!this.warned) {
        console.warn('[teleping] Missing TELEPING_TOKEN or TELEPING_CHAT. Notifications disabled.')
        this.warned = true
      }
      this.config = null
      return null
    }

    this.config = { token, chatId }
    return this.config
  }

  private isQuietHour(cfg: TelepingConfig): boolean {
    if (cfg.quietStart === undefined || cfg.quietEnd === undefined) return false

    let currentHour: number
    if (cfg.timezone) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: cfg.timezone,
      })
      currentHour = parseInt(formatter.format(new Date()), 10)
    } else {
      currentHour = new Date().getHours()
    }

    const { quietStart, quietEnd } = cfg
    if (quietStart > quietEnd) {
      return currentHour >= quietStart || currentHour < quietEnd
    }
    return currentHour >= quietStart && currentHour < quietEnd
  }

  private trackDigest(msg: Message): void {
    this.digest_[msg.level]++
    if (msg.level === 'error') {
      this.digest_.errors.push(msg.label)
    }
    if (msg.level === 'metric' && msg.value !== undefined) {
      this.digest_.metrics.push([msg.label, msg.value])
    }
  }

  private logError = (err: unknown): void => {
    console.error('[teleping] Send failed:', err)
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const teleping = new Teleping()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshDigest(): DigestStats {
  return { log: 0, success: 0, warn: 0, error: 0, metric: 0, errors: [], metrics: [] }
}
