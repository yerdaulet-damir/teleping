import type { DigestStats, EmojiMap, Level, Message, RichButton } from './types.js'
import type { ButtonSpec } from './types.js'
import { DEFAULT_THEME, type ThemeDefinition } from './themes.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━'

const LEVEL_EMOJI: Record<Level, string> = {
  log: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '🔴',
  metric: '📊',
}

const MAX_DATA_ENTRIES = 20

// ─── Format options ───────────────────────────────────────────────────────────

export interface FormatOptions {
  theme?: ThemeDefinition
  separator?: string
  customEmoji?: EmojiMap
  footer?: string
  expandData?: boolean
  codeBlock?: { content: string; language?: string }
  spoilerFields?: string[]
  overrideButtons?: RichButton[][]
}

// ─── HTML primitives ──────────────────────────────────────────────────────────

export function blockquote(text: string, expandable = false): string {
  return expandable
    ? `<blockquote expandable>${text}</blockquote>`
    : `<blockquote>${text}</blockquote>`
}

export function codeBlock(content: string, language?: string): string {
  const escaped = escapeHtml(content)
  return language
    ? `<pre><code class="language-${language}">${escaped}</code></pre>`
    : `<pre><code>${escaped}</code></pre>`
}

export function spoiler(text: string): string {
  return `<tg-spoiler>${text}</tg-spoiler>`
}

export function underline(text: string): string {
  return `<u>${text}</u>`
}

export function strikethrough(text: string): string {
  return `<s>${text}</s>`
}

export function renderProgressBar(current: number, total: number, width = 15): string {
  const filled = Math.round((current / total) * width)
  const empty = width - filled
  return `${'▓'.repeat(Math.max(0, filled))}${'░'.repeat(Math.max(0, empty))}`
}

// ─── Single message ───────────────────────────────────────────────────────────

export function formatMessage(
  msg: Message,
  app?: string,
  opts?: FormatOptions
): { text: string; buttons: RichButton[][] } {
  const theme = opts?.theme ?? DEFAULT_THEME
  const sep = opts?.separator ?? theme.separator ?? DEFAULT_SEPARATOR
  const emoji = (opts?.customEmoji?.[msg.level]) ?? LEVEL_EMOJI[msg.level]
  const time = formatTime(msg.timestamp)
  const lines: string[] = []

  // Header
  if (msg.level === 'metric') {
    lines.push(theme.headerBold
      ? `${emoji} <b>${escapeHtml(msg.label)}</b>: ${msg.value ?? 0}`
      : `${emoji} ${escapeHtml(msg.label)}: ${msg.value ?? 0}`)
  } else {
    lines.push(theme.headerBold
      ? `${emoji} <b>${escapeHtml(msg.label)}</b>`
      : `${emoji} ${escapeHtml(msg.label)}`)
  }

  // Data section
  const dataEntries = msg.data ? Object.entries(msg.data) : []
  if (dataEntries.length > 0) {
    const show = dataEntries.slice(0, MAX_DATA_ENTRIES)
    const dataLines: string[] = []
    for (const [key, val] of show) {
      const valStr = formatValue(val, opts?.spoilerFields?.includes(key))
      dataLines.push(`${escapeHtml(key)}: ${valStr}`)
    }
    if (dataEntries.length > MAX_DATA_ENTRIES) {
      dataLines.push(`<i>...and ${dataEntries.length - MAX_DATA_ENTRIES} more</i>`)
    }

    lines.push(sep)
    if (opts?.expandData && theme.dataFormat === 'expandable-blockquote') {
      lines.push(blockquote(dataLines.join('\n'), true))
    } else if (theme.dataFormat === 'blockquote') {
      lines.push(blockquote(dataLines.join('\n')))
    } else {
      lines.push(...dataLines)
    }
  }

  // Code block section
  if (opts?.codeBlock) {
    lines.push(sep)
    lines.push(codeBlock(opts.codeBlock.content, opts.codeBlock.language))
  }

  // Footer
  lines.push(sep)
  const appPart = app ? `${escapeHtml(app)} · ${time}` : time
  if (opts?.footer) {
    lines.push(appPart)
    lines.push(escapeHtml(opts.footer))
  } else {
    lines.push(appPart)
  }
  lines.push(theme.footerItalic ? `<i>sent via teleping</i>` : `sent via teleping`)

  // Buttons
  let buttons: RichButton[][]
  if (opts?.overrideButtons !== undefined) {
    buttons = opts.overrideButtons
  } else if (msg.level === 'error') {
    buttons = buildDefaultErrorButtons(msg)
  } else {
    buttons = []
  }

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
    DEFAULT_SEPARATOR,
    `${count} events batched`,
    DEFAULT_SEPARATOR,
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
    DEFAULT_SEPARATOR,
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

  lines.push(DEFAULT_SEPARATOR)
  lines.push(`${app ? `${escapeHtml(app)} · ` : ''}${time}\n<i>sent via teleping</i>`)

  return { text: lines.join('\n') }
}

// ─── Button preset resolution ─────────────────────────────────────────────────

export function resolveButtonPresets(
  specs: ButtonSpec[],
  context: { label: string; stack?: string; data?: Record<string, unknown> }
): RichButton[] {
  const buttons: RichButton[] = []

  for (const spec of specs) {
    if (typeof spec === 'string') {
      switch (spec) {
        case 'cursor': {
          if (context.stack) {
            const fl = parseStackFileLine(context.stack)
            if (fl) {
              buttons.push({ text: '📂 Open in Cursor', url: `cursor://file/${fl.file}:${fl.line}` })
            }
          }
          break
        }
        case 'claude': {
          const content = `Error: ${context.label}\n${context.stack ?? ''}`
          buttons.push({ text: '🤖 Copy for Claude', copy_text: { text: content.slice(0, 4096) } })
          break
        }
        case 'chatgpt': {
          const content = `Error: ${context.label}\n${context.stack ?? ''}`
          buttons.push({ text: '💬 Copy for ChatGPT', copy_text: { text: content.slice(0, 4096) } })
          break
        }
        case 'copy-stack': {
          if (context.stack) {
            buttons.push({ text: '📋 Copy Stack', copy_text: { text: context.stack.slice(0, 4096) } })
          }
          break
        }
        case 'copy-data': {
          if (context.data) {
            buttons.push({ text: '📋 Copy Data', copy_text: { text: JSON.stringify(context.data, null, 2).slice(0, 4096) } })
          }
          break
        }
        case 'dismiss': {
          console.warn('[teleping] "dismiss" button requires a webhook to handle callback_data')
          buttons.push({ text: '✕ Dismiss', callback_data: 'teleping:dismiss' })
          break
        }
      }
    } else {
      // CustomButton
      if (spec.copy) {
        buttons.push({ text: spec.text, copy_text: { text: spec.copy.slice(0, 4096) } })
      } else if (spec.url) {
        buttons.push({ text: spec.text, url: spec.url })
      } else if (spec.callback) {
        buttons.push({ text: spec.text, callback_data: spec.callback })
      }
    }
  }

  return buttons
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatValue(val: unknown, wrapInSpoiler = false): string {
  let result: string
  if (val === null || val === undefined) result = '<i>null</i>'
  else if (typeof val === 'string') result = escapeHtml(val)
  else if (typeof val === 'number' || typeof val === 'boolean') result = String(val)
  else result = `<code>${escapeHtml(JSON.stringify(val))}</code>`

  return wrapInSpoiler ? spoiler(result) : result
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

function buildDefaultErrorButtons(msg: Message): RichButton[][] {
  const row: RichButton[] = []

  const stack = typeof msg.data?.['stack'] === 'string' ? msg.data['stack'] : null
  if (stack) {
    const fileLine = parseStackFileLine(stack)
    if (fileLine) {
      row.push({ text: '📂 Open in Cursor', url: `cursor://file/${fileLine.file}:${fileLine.line}` })
    }
  }

  // Copy for Claude using copy_text (Bot API 7.11) — no URL hack needed
  const errorContext = `Error: ${msg.label}\n${msg.data?.['error'] ?? msg.data?.['message'] ?? ''}`
  row.push({ text: '🤖 Copy for Claude', copy_text: { text: errorContext.slice(0, 4096) } })

  return row.length > 0 ? [row] : []
}
