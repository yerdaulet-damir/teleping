// ─── teleping types ──────────────────────────────────────────────────────────

export type Level = 'log' | 'success' | 'warn' | 'error' | 'metric'

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'rich' | 'minimal' | 'compact'
export type EmojiMap = Partial<Record<Level, string>>

// ─── Routing ──────────────────────────────────────────────────────────────────

export interface RouteTarget { chatId?: string; threadId?: string }
export type LevelRoutes = Partial<Record<Level, RouteTarget>>

// ─── Buttons ──────────────────────────────────────────────────────────────────

export type ButtonPreset = 'cursor' | 'claude' | 'chatgpt' | 'copy-stack' | 'copy-data' | 'dismiss'
export interface CustomButton { text: string; url?: string; copy?: string; callback?: string }
export type ButtonSpec = ButtonPreset | CustomButton
export type ButtonConfig = Partial<Record<Level | 'default', ButtonSpec[]>>

export interface RichButton {
  text: string
  url?: string
  callback_data?: string
  copy_text?: { text: string }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface TelepingConfig {
  token: string
  chatId: string
  app?: string | undefined
  timezone?: string | undefined
  quietStart?: number | undefined
  quietEnd?: number | undefined
  batchWindowMs?: number | undefined
  theme?: Theme | undefined
  emoji?: EmojiMap | undefined
  footer?: string | undefined
  separator?: string | undefined
  routes?: LevelRoutes | undefined
  buttons?: ButtonConfig | undefined
}

// ─── Internal message ─────────────────────────────────────────────────────────

export interface Message {
  level: Level
  label: string
  data?: Record<string, unknown> | undefined
  value?: number | undefined
  timestamp: number
}

// ─── Telegram types ───────────────────────────────────────────────────────────

export interface SendMessageParams {
  token: string
  chatId: string
  text: string
  buttons?: RichButton[][] | undefined
  threadId?: string | undefined
  disableNotification?: boolean | undefined
}

export interface EditMessageParams {
  token: string
  chatId: string
  messageId: number
  text: string
  buttons?: RichButton[][] | undefined
}

export interface TelegramApiResponse {
  ok: boolean
  description?: string | undefined
  result?: unknown
}

// ─── Builder payload ──────────────────────────────────────────────────────────

export interface BuilderPayload {
  level: Level
  label: string
  timestamp: number
  data?: Record<string, unknown>
  value?: number
  codeBlock?: { content: string; language?: string }
  spoilerFields?: string[]
  expandData?: boolean
  buttons?: ButtonSpec[]
}

// ─── Component types ──────────────────────────────────────────────────────────

export interface CardOptions {
  title: string
  subtitle?: string
  fields?: Record<string, unknown>
  level?: Level
  actions?: ButtonSpec[]
}

export interface ProgressOptions {
  current: number
  total: number
  unit?: string
}

export interface TableRow {
  [col: string]: string | number | boolean
}

export interface ChecklistItem {
  label: string
  done: boolean
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
