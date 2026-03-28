import type { DigestStats, InlineButton, Level, Message } from './types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━'

const LEVEL_EMOJI: Record<Level, string> = {
  log: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '🔴',
  metric: '📊',
}

const MAX_DATA_ENTRIES = 20

// ─── Single message ───────────────────────────────────────────────────────────

export function formatMessage(
  msg: Message,
  app?: string
): { text: string; buttons: InlineButton[][] } {
  const emoji = LEVEL_EMOJI[msg.level]
  const time = formatTime(msg.timestamp)
  const lines: string[] = []

  // Header
  if (msg.level === 'metric') {
    lines.push(`${emoji} <b>${escapeHtml(msg.label)}</b>: ${msg.value ?? 0}`)
  } else {
    lines.push(`${emoji} <b>${escapeHtml(msg.label)}</b>`)
  }

  // Data section
  if (msg.data && Object.keys(msg.data).length > 0) {
    lines.push(SEPARATOR)
    const entries = Object.entries(msg.data)
    const show = entries.slice(0, MAX_DATA_ENTRIES)
    for (const [key, val] of show) {
      lines.push(`${escapeHtml(key)}: ${formatValue(val)}`)
    }
    if (entries.length > MAX_DATA_ENTRIES) {
      lines.push(`<i>...and ${entries.length - MAX_DATA_ENTRIES} more</i>`)
    }
  }

  // Footer
  lines.push(SEPARATOR)
  const footer = app ? `${escapeHtml(app)} · ${time}` : time
  lines.push(`${footer}\n<i>sent via teleping</i>`)

  // Buttons for errors
  const buttons: InlineButton[][] = msg.level === 'error'
    ? buildErrorButtons(msg)
    : []

  return { text: lines.join('\n'), buttons }
}

// ─── Batch summary ────────────────────────────────────────────────────────────

export function formatBatch(
  label: string,
  count: number,
  level: Level,
  app?: string
): { text: string } {
  const emoji = LEVEL_EMOJI[level]
  const time = formatTime(Date.now())
  const lines: string[] = [
    `${emoji} <b>${count}× ${escapeHtml(label)}</b>`,
    SEPARATOR,
    `${count} events batched`,
    SEPARATOR,
    `${app ? `${escapeHtml(app)} · ` : ''}${time}\n<i>sent via teleping</i>`,
  ]
  return { text: lines.join('\n') }
}

// ─── Digest summary ──────────────────────────────────────────────────────────

export function formatDigest(stats: DigestStats, app?: string): { text: string } {
  const time = formatTime(Date.now())
  const total = stats.log + stats.success + stats.warn + stats.error + stats.metric
  const lines: string[] = [
    `📋 <b>Digest</b> — ${total} events`,
    SEPARATOR,
  ]

  if (stats.success > 0) lines.push(`✅ ${stats.success} success`)
  if (stats.error > 0) lines.push(`🔴 ${stats.error} errors`)
  if (stats.warn > 0) lines.push(`⚠️ ${stats.warn} warnings`)
  if (stats.log > 0) lines.push(`ℹ️ ${stats.log} info`)
  if (stats.metric > 0) lines.push(`📊 ${stats.metric} metrics`)

  if (stats.errors.length > 0) {
    lines.push('')
    lines.push('<b>Recent errors:</b>')
    for (const err of stats.errors.slice(0, 5)) {
      lines.push(`  · ${escapeHtml(err)}`)
    }
  }

  if (stats.metrics.length > 0) {
    lines.push('')
    lines.push('<b>Metrics:</b>')
    for (const [label, value] of stats.metrics.slice(0, 10)) {
      lines.push(`  · ${escapeHtml(label)}: ${value}`)
    }
  }

  lines.push(SEPARATOR)
  lines.push(`${app ? `${escapeHtml(app)} · ` : ''}${time}\n<i>sent via teleping</i>`)

  return { text: lines.join('\n') }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '<i>null</i>'
  if (typeof val === 'string') return escapeHtml(val)
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  return `<code>${escapeHtml(JSON.stringify(val))}</code>`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function parseStackFileLine(stack: string): { file: string; line: number } | null {
  const match = /at .+ \((.+):(\d+):\d+\)/.exec(stack)
  if (!match?.[1] || !match[2]) return null
  return { file: match[1], line: parseInt(match[2], 10) }
}

function buildErrorButtons(msg: Message): InlineButton[][] {
  const row: InlineButton[] = []

  // Try to extract file:line from error stack or data
  const stack = typeof msg.data?.['stack'] === 'string' ? msg.data['stack'] : null
  if (stack) {
    const fileLine = parseStackFileLine(stack)
    if (fileLine) {
      row.push({ text: '📂 Open in Cursor', url: `cursor://file/${fileLine.file}:${fileLine.line}` })
    }
  }

  // Copy for Claude — pre-fill error context
  const errorContext = `Error: ${msg.label}\n${msg.data?.['error'] ?? msg.data?.['message'] ?? ''}`
  const encoded = encodeURIComponent(errorContext.slice(0, 2000))
  row.push({ text: '🤖 Copy for Claude', url: `https://claude.ai/new?q=${encoded}` })

  return row.length > 0 ? [row] : []
}
