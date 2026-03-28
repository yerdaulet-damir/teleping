import type { Level, Message } from './types.js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchEntry {
  count: number
  level: Level
  label: string
  timer: ReturnType<typeof setTimeout>
}

export type FlushCallback = (label: string, count: number, level: Level) => void

// ─── BatchManager ─────────────────────────────────────────────────────────────

/**
 * Groups duplicate events within a time window.
 * First event always sends immediately. Subsequent duplicates are counted.
 * When the window expires, a batch summary is sent if count > 1.
 * Errors are never batched — they always send immediately.
 */
export class BatchManager {
  private store = new Map<string, BatchEntry>()
  private windowMs: number
  private onFlush: FlushCallback

  constructor(onFlush: FlushCallback, windowMs = 5 * 60 * 1000) {
    this.onFlush = onFlush
    this.windowMs = windowMs
  }

  /**
   * Add a message to the batch.
   * Returns 'send' if this message should be sent immediately.
   * Returns 'batched' if it was absorbed into an existing batch.
   */
  add(msg: Message): 'send' | 'batched' {
    // Errors always send immediately, never batch
    if (msg.level === 'error') return 'send'

    const key = `${msg.level}:${msg.label}`
    const existing = this.store.get(key)

    if (existing) {
      existing.count++
      return 'batched'
    }

    // First occurrence — send immediately, start timer for batch summary
    const timer = setTimeout(() => {
      const entry = this.store.get(key)
      this.store.delete(key)
      if (entry && entry.count > 1) {
        this.onFlush(entry.label, entry.count, entry.level)
      }
    }, this.windowMs)

    // Don't keep Node.js alive just for batch timers
    if (timer && typeof timer === 'object' && 'unref' in timer) {
      timer.unref()
    }

    this.store.set(key, { count: 1, level: msg.level, label: msg.label, timer })
    return 'send'
  }

  /** Flush all pending batches immediately. Used for shutdown. */
  flushAll(): void {
    for (const [key, entry] of this.store) {
      clearTimeout(entry.timer)
      if (entry.count > 1) {
        this.onFlush(entry.label, entry.count, entry.level)
      }
    }
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}
