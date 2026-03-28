import { BatchManager } from './batch.js'
import { formatBatch, formatDigest, formatMessage } from './format.js'
import { sendMessage } from './send.js'
import type { DigestStats, Level, Message, TelepingConfig } from './types.js'

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_BATCH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

// ─── Teleping class ─────────────────────────────────────────────────────────

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

  // ─── Public API ───────────────────────────────────────────────────────────

  log(label: string, data?: Record<string, unknown>): void {
    this.emit({ level: 'log', label, data, timestamp: Date.now() })
  }

  success(label: string, data?: Record<string, unknown>): void {
    this.emit({ level: 'success', label, data, timestamp: Date.now() })
  }

  warn(label: string, data?: Record<string, unknown>): void {
    this.emit({ level: 'warn', label, data, timestamp: Date.now() })
  }

  error(label: string, data?: Record<string, unknown>): void {
    this.emit({ level: 'error', label, data, timestamp: Date.now() })
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

  // ─── Internal ─────────────────────────────────────────────────────────────

  private emit(msg: Message): void {
    const cfg = this.resolve()
    if (!cfg) return

    // Track for digest
    this.trackDigest(msg)

    // Quiet hours — suppress non-critical
    if (msg.level !== 'error' && this.isQuietHour(cfg)) return

    // Batching
    const action = this.batchManager.add(msg)
    if (action === 'batched') return

    // Send immediately
    const { text, buttons } = formatMessage(msg, cfg.app)
    sendMessage({ token: cfg.token, chatId: cfg.chatId, text, buttons }).catch(this.logError)
  }

  private sendBatchSummary(label: string, count: number, level: Level): void {
    const cfg = this.resolve()
    if (!cfg) return
    const { text } = formatBatch(label, count, level, cfg.app)
    sendMessage({ token: cfg.token, chatId: cfg.chatId, text }).catch(this.logError)
  }

  /** Lazy resolve config from env. Warn once if missing. */
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
    // Handle midnight-crossing ranges like 23:00 - 07:00
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
