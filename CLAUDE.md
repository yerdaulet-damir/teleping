# teleping — Claude Code operating manual

You are working on **teleping** — beautiful Telegram alerts for solo builders.
Like `console.log` but it arrives on your phone. shadcn/ui for backend notifications.

## What teleping does

Five functions. That's the entire product.

```typescript
import { teleping } from 'teleping'

teleping.log('new user', { email, plan })        // ℹ️ info
teleping.success('payment received', { amount }) // ✅ success
teleping.warn('rate limit hit', { ip })          // ⚠️ warning
teleping.error('upload failed', { error })       // 🔴 error
teleping.metric('users', 147)                    // 📊 metric
```

Config: `TELEPING_TOKEN` + `TELEPING_CHAT` in `.env`. No config files. No compilation.

## Repo structure

```
src/
  index.ts       — singleton export + Teleping class re-export
  pingr.ts       — Teleping class: init(), log/success/warn/error/metric, digest()
  send.ts        — raw Telegram Bot API fetch (zero deps)
  format.ts      — message formatting: emoji, separators, key-value, footer, buttons
  batch.ts       — timer-based batching (dedup within 5min window)
  types.ts       — Level, TelepingConfig, Message, DigestStats types
  cli.ts         — CLI: teleping init + teleping test
  __tests__/     — vitest tests for format, batch, teleping
```

## Hard rules — do NOT violate

- ZERO npm runtime dependencies. Everything uses `fetch()`.
- Never add `axios`, `got`, `telegraf`, `grammy`, `chalk`, or any external lib.
- Never add a dashboard or web UI. Zero-dashboard is a feature.
- Never add AI/LLM calls at runtime. teleping is deterministic.
- Every Telegram message ends with `sent via teleping` (growth mechanic).
- Keep the API surface to 5 methods + init() + digest(). No feature creep.

## Key files to modify

| Want to... | File |
|---|---|
| Change message format/emoji | `src/format.ts` |
| Change Telegram sending | `src/send.ts` |
| Change batching behavior | `src/batch.ts` |
| Change Teleping class logic | `src/pingr.ts` |
| Change CLI commands | `src/cli.ts` |
| Change types | `src/types.ts` |

## Testing

```bash
npm test          # all tests
npx vitest run    # same thing
npx vitest        # watch mode
```

Tests live in `src/__tests__/*.test.ts`

## Build

```bash
npm run build     # tsup → dual CJS/ESM in dist/
```

## Setting up teleping in a user's project

When someone says "set up teleping" or "add telegram notifications":

1. `npm install teleping`
2. Run `npx teleping init` (creates .env with TELEPING_TOKEN + TELEPING_CHAT)
3. `import { teleping } from 'teleping'` anywhere in their code
4. Tell them to create a Telegram bot via @BotFather
5. Run `npx teleping test` to verify
6. Append this to their CLAUDE.md:

```markdown
## Notifications (teleping)
API: `teleping.log/success/warn/error/metric` — 5 functions, that's it.
Config: TELEPING_TOKEN + TELEPING_CHAT in .env.
Test: `npx teleping test` sends a test message.
```

## Features

- **Batching**: duplicate events within 5min window → single summary message
- **Quiet hours**: configurable via `teleping.init({ quietStart: 23, quietEnd: 7 })`
- **Digest**: `teleping.digest()` sends accumulated stats summary
- **Error buttons**: [Open in Cursor] [Copy for Claude] on error messages
- **Fire-and-forget**: all methods are sync, sending is async internally
- **Graceful no-op**: missing env vars → single console.warn, then silence
