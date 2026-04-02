import { renderProgressBar } from './format.js'
import type { BuilderPayload, CardOptions, ChecklistItem, ProgressOptions, TableRow } from './types.js'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function buildCardPayload(opts: CardOptions, ts: number): BuilderPayload {
  const level = opts.level ?? 'log'
  const data: Record<string, unknown> = {}
  if (opts.subtitle) data['subtitle'] = opts.subtitle
  if (opts.fields) Object.assign(data, opts.fields)
  return {
    level,
    label: opts.title,
    timestamp: ts,
    data: Object.keys(data).length > 0 ? data : undefined,
    buttons: opts.actions,
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function buildProgressPayload(label: string, opts: ProgressOptions, ts: number): BuilderPayload {
  const bar = renderProgressBar(opts.current, opts.total)
  const unit = opts.unit ? ` ${opts.unit}` : ''
  const pct = opts.total > 0 ? Math.round((opts.current / opts.total) * 100) : 0
  return {
    level: 'log',
    label,
    timestamp: ts,
    data: {
      progress: `${bar} ${opts.current}/${opts.total}${unit} (${pct}%)`,
    },
  }
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function buildTablePayload(title: string, rows: TableRow[], ts: number): BuilderPayload {
  if (rows.length === 0) {
    return { level: 'log', label: title, timestamp: ts }
  }

  const cols = Object.keys(rows[0]!)
  const colWidths = cols.map(col =>
    Math.max(col.length, ...rows.map(r => String(r[col] ?? '').length))
  )

  const header = cols.map((c, i) => c.padEnd(colWidths[i]!)).join('  ')
  const divider = colWidths.map(w => '─'.repeat(w)).join('──')
  const dataRows = rows.map(row =>
    cols.map((c, i) => String(row[c] ?? '').padEnd(colWidths[i]!)).join('  ')
  )

  const table = [header, divider, ...dataRows].join('\n')
  return {
    level: 'log',
    label: title,
    timestamp: ts,
    codeBlock: { content: table },
  }
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export function buildChecklistPayload(title: string, items: ChecklistItem[], ts: number): BuilderPayload {
  const data: Record<string, unknown> = {}
  for (const item of items) {
    data[item.label] = item.done ? '✅' : '⬜'
  }
  return {
    level: 'log',
    label: title,
    timestamp: ts,
    data,
  }
}
