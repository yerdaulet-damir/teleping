// ─── teleping types ──────────────────────────────────────────────────────────

export type Level = 'log' | 'success' | 'warn' | 'error' | 'metric'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface TelepingConfig {
  token: string
  chatId: string
  app?: string | undefined
  timezone?: string | undefined
  quietStart?: number | undefined // hour 0-23
  quietEnd?: number | undefined   // hour 0-23
  batchWindowMs?: number | undefined // default 5 minutes
}

// ─── Internal message ─────────────────────────────────────────────────────────

export interface Message {
  level: Level
  label: string
  data?: Record<string, unknown> | undefined
  value?: number | undefined // for metric
  timestamp: number
}

// ─── Telegram types ───────────────────────────────────────────────────────────

export interface InlineButton {
  text: string
  url?: string | undefined
  callback?: string | undefined
}

export interface SendMessageParams {
  token: string
  chatId: string
  text: string
  buttons?: InlineButton[][] | undefined
}

export interface TelegramApiResponse {
  ok: boolean
  description?: string | undefined
  result?: unknown
}

// ─── Digest store ─────────────────────────────────────────────────────────────

export interface DigestStats {
  log: number
  success: number
  warn: number
  error: number
  metric: number
  errors: string[]
  metrics: [label: string, value: number][]
}
