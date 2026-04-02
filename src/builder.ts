import type { BuilderPayload, ButtonSpec, Level } from './types.js'

// ─── MessageBuilder ───────────────────────────────────────────────────────────

/**
 * Fluent builder for rich Telegram messages.
 * Created when a teleping method is called with only a label (no data).
 * Requires .send() to actually fire — forgetting .send() = nothing sent.
 *
 * @example
 * teleping.error('stripe webhook failed')
 *   .data({ userId, amount })
 *   .code(err.stack, 'typescript')
 *   .copyButton('Copy for Claude', err.stack)
 *   .send()
 */
export class MessageBuilder {
  private payload: BuilderPayload

  constructor(
    level: Level,
    label: string,
    private readonly sendFn: (payload: BuilderPayload) => void
  ) {
    this.payload = { level, label, timestamp: Date.now() }
  }

  /** Attach key-value context data. */
  data(d: Record<string, unknown>): this {
    this.payload.data = d
    return this
  }

  /** Set numeric value (for metric builders). */
  value(n: number): this {
    this.payload.value = n
    return this
  }

  /** Append a code block (stack traces, SQL, config snippets, etc). */
  code(content: string, language?: string): this {
    this.payload.codeBlock = language !== undefined ? { content, language } : { content }
    return this
  }

  /** Hide specific data keys behind a Telegram spoiler tag. */
  spoiler(...keys: string[]): this {
    this.payload.spoilerFields = [...(this.payload.spoilerFields ?? []), ...keys]
    return this
  }

  /** Wrap data section in a collapsible blockquote (requires rich theme). */
  expand(): this {
    this.payload.expandData = true
    return this
  }

  /** Add a button by preset name, custom object, or text+url shorthand. */
  button(spec: ButtonSpec): this
  button(text: string, url: string): this
  button(specOrText: ButtonSpec | string, url?: string): this {
    if (typeof specOrText === 'string' && url !== undefined) {
      this.payload.buttons = [...(this.payload.buttons ?? []), { text: specOrText, url }]
    } else {
      this.payload.buttons = [...(this.payload.buttons ?? []), specOrText as ButtonSpec]
    }
    return this
  }

  /** Add a copy-to-clipboard button (Bot API 7.11 — no webhook needed). */
  copyButton(text: string, content: string): this {
    this.payload.buttons = [...(this.payload.buttons ?? []), { text, copy: content }]
    return this
  }

  /** Fire the message. Terminal operation — call once at the end of the chain. */
  send(): void {
    this.sendFn(this.payload)
  }
}
