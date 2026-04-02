<div align="center">

```
 ████████╗███████╗██╗     ███████╗██████╗ ██╗███╗   ██╗ ██████╗
 ╚══██╔══╝██╔════╝██║     ██╔════╝██╔══██╗██║████╗  ██║██╔════╝
    ██║   █████╗  ██║     █████╗  ██████╔╝██║██╔██╗ ██║██║  ███╗
    ██║   ██╔══╝  ██║     ██╔══╝  ██╔═══╝ ██║██║╚██╗██║██║   ██║
    ██║   ███████╗███████╗███████╗██║     ██║██║ ╚████║╚██████╔╝
    ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝
```

**like `console.log` but it arrives on your phone.**<br>
telegram alerts for solo builders — 1 import, 5 functions, zero deps.

[![npm](https://img.shields.io/npm/v/teleping?color=3ECF8E&style=flat-square)](https://npmjs.com/package/teleping)
[![tests](https://img.shields.io/github/actions/workflow/status/yerdaulet-damir/teleping/ci.yml?label=tests&style=flat-square)](https://github.com/yerdaulet-damir/teleping/actions)
[![license](https://img.shields.io/badge/license-MIT-3ECF8E.svg?style=flat-square)](LICENSE)
[![bundle](https://img.shields.io/bundlephobia/minzip/teleping?color=3ECF8E&style=flat-square)](https://bundlephobia.com/package/teleping)
[![zero deps](https://img.shields.io/badge/dependencies-0-3ECF8E?style=flat-square)](#)

<br>

[![teleping](https://coolreadme.xyz/api/docs-card?pkg=teleping&version=0.2.1&desc=Telegram+alerts+for+vibe+coders.+Know+what+broke+and+what+shipped+%E2%80%94+the+moment+it+happens.&install=npm+install+teleping&theme=langchain)](https://npmjs.com/package/teleping)

</div>

---

```typescript
// your stripe webhook just broke at 2am.
// you're asleep. teleping is not.

import { teleping } from 'teleping'

// simple — drop anywhere, fire-and-forget
teleping.success('New user', { email: 'alex@startup.com', plan: 'pro' })
teleping.error('Payment failed', { amount: 15, reason: 'card_declined' })

// builder — full context, tap [Copy for Claude] from your phone
teleping.error('Stripe webhook failed')
  .data({ userId, amount, event: event.type })
  .code(err.stack, 'typescript')
  .button('claude')    // one tap → error context in clipboard, ready for Claude
  .button('cursor')    // one tap → opens exact file:line in Cursor
  .send()
```

<div align="center">

| | DIY bot | teleping |
|---|---|---|
| Setup | write it yourself | `npm install teleping` |
| Format | ugly plain text | emoji + separators + structured |
| 50 same errors | 50 messages, phone dies | 1 batched message |
| 3AM non-critical | wakes you | quiet hours suppress it |
| Error on phone | stare at it | [Open in Cursor] [Copy for Claude] |
| Every project | rewrite from scratch | 1 import |

</div>

## Why

You're vibe coding. Cursor, Claude, Vercel, Supabase — everything ships fast. But the moment code hits production, you're blind. You find out about broken payments from users. You find out about signups by checking your dashboard at noon.

**teleping makes your app talk to you directly on Telegram.** Every signup, payment, error, and metric — on your phone, beautifully formatted, the moment it happens.

```
shadcn/ui   → beautiful components in 1 line
prisma      → beautiful database queries in 1 line
teleping    → beautiful production alerts in 1 line
```

## Install

```bash
npm install teleping
```

## Setup (2 minutes, one time)

1. Message [@BotFather](https://t.me/BotFather) on Telegram → create a bot → copy the token
2. Start a chat with your new bot → get your chat ID
3. Add to `.env`:

```env
TELEPING_TOKEN=your_bot_token
TELEPING_CHAT=your_chat_id
```

Or run the CLI — it does all of this:

```bash
npx teleping init   # creates .env with TELEPING_TOKEN + TELEPING_CHAT
npx teleping test   # sends a test message to verify
```

## Usage

```typescript
import { teleping } from 'teleping'

// five functions. that's the whole API.
teleping.log('Server started', { port: 3000 })
teleping.success('New user', { email, plan })
teleping.warn('Rate limit hit', { ip, endpoint })
teleping.error('Payment failed', { error: err.message, userId })
teleping.metric('Monthly revenue', 4500)
```

What lands on your phone:

```
✅ New user
━━━━━━━━━━━━━━━━━━━━━
email    alex@startup.com
plan     pro
━━━━━━━━━━━━━━━━━━━━━
myapp.com · 14:23
sent via teleping

🔴 Payment failed
━━━━━━━━━━━━━━━━━━━━━
error    Stripe timeout
userId   usr_abc123
━━━━━━━━━━━━━━━━━━━━━
myapp.com · 02:14
sent via teleping

[📂 Open in Cursor]  [🤖 Copy for Claude]
```

## Builder API

Call any method with **only a label** (no data object) to get a `MessageBuilder`. Chain modifiers, call `.send()` once. LLM-friendly — describe what you want in a comment and Claude writes the chain.

```typescript
teleping.error('Stripe webhook failed')
  .data({ userId, amount, stripeEvent: event.type })   // key-value context
  .code(err.stack, 'typescript')                        // syntax-highlighted stack
  .spoiler('userId')                                    // hide behind tap-to-reveal
  .expand()                                             // collapsible data section
  .button('claude')                                     // Copy for Claude
  .button('cursor')                                     // Open in Cursor
  .button('chatgpt')                                    // Copy for ChatGPT
  .button('copy-stack')                                 // Copy raw stack
  .button('copy-data')                                  // Copy data as JSON
  .button('View in Stripe', 'https://dashboard.stripe.com/...')
  .copyButton('Copy event ID', event.id)
  .send()
```

| Method | Description |
|---|---|
| `.data(obj)` | Key-value context fields |
| `.value(n)` | Numeric value (metric builders) |
| `.code(content, lang?)` | Code block with optional syntax class |
| `.spoiler(...keys)` | Hide data fields behind Telegram spoiler tag |
| `.expand()` | Wrap data in collapsible blockquote |
| `.button(preset)` | Add button by preset name |
| `.button(text, url)` | URL button shorthand |
| `.copyButton(text, content)` | Copy-to-clipboard button — no webhook needed |
| `.send()` | Fire. Required. Call once at the end. |

**Button presets:**

| Preset | What it does |
|---|---|
| `'cursor'` | Opens exact `file:line` from stack trace in Cursor |
| `'claude'` | One tap copies full error context → paste into Claude |
| `'chatgpt'` | Same for ChatGPT |
| `'copy-stack'` | Copies raw stack trace |
| `'copy-data'` | Copies context data as formatted JSON |

## Components

Structured message formats — shadcn-style building blocks.

```typescript
// Card — any structured event
teleping.card({
  title: 'Deploy complete',
  subtitle: 'production · v2.4.1',
  fields: { duration: '48s', tests: '312 passed', coverage: '94%' },
  level: 'success',
  actions: [{ text: 'View on Vercel', url: 'https://vercel.com/...' }],
})

// Progress bar
teleping.progress('Importing users', { current: 847, total: 1200, unit: 'users' })
// → ▓▓▓▓▓▓▓▓▓▓░░░░░  847/1200 users (71%)

// Table
teleping.table('Top plans today', [
  { plan: 'pro',     signups: 14, revenue: '$420' },
  { plan: 'starter', signups: 38, revenue: '$190' },
])

// Checklist
teleping.checklist('Deploy checklist', [
  { label: 'Migrations run', done: true },
  { label: 'Cache warmed',   done: true },
  { label: 'Smoke tests',    done: false },
])
```

## Vibe coding workflow

You're building in Cursor, shipping to Vercel, debugging with Claude. teleping is built for that loop.

**Add this to your `CLAUDE.md` once** — Claude will instrument every new route correctly without you explaining it:

```markdown
## Notifications (teleping)
API: teleping.log / .success / .warn / .error / .metric — fire-and-forget, no await
Builder: teleping.error('label').data({}).code(stack).button('claude').send()
Components: teleping.card() / .progress() / .table() / .checklist()
Config: TELEPING_TOKEN + TELEPING_CHAT in .env
Test: npx teleping test
```

**The production debugging loop:**

1. Something breaks at 2AM
2. Your phone: `🔴 Stripe webhook failed` with full stack
3. Tap **[Copy for Claude]** — error context is in clipboard
4. Open Claude, paste, get the fix
5. Or tap **[Open in Cursor]** — jumps to exact file and line

## Real-world examples

### Next.js + Supabase auth

```typescript
// app/api/auth/callback/route.ts
export async function GET(req: Request) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    teleping.error('Auth failed', { error: error.message })
    return redirect('/login?error=auth')
  }

  teleping.success('New signup', {
    email: data.user.email,
    provider: data.user.app_metadata.provider,
  })
  return redirect('/dashboard')
}
```

### Stripe webhook

```typescript
// app/api/webhooks/stripe/route.ts
switch (event.type) {
  case 'checkout.session.completed':
    teleping.success('Payment received', {
      amount: `$${session.amount_total / 100}`,
      email: session.customer_email,
      plan: session.metadata.plan,
    })
    break

  case 'charge.failed':
    teleping.error('Payment failed')
      .data({ amount: `$${event.data.object.amount / 100}`, reason: event.data.object.failure_message })
      .button('claude')
      .send()
    break
}
```

### Global error handler

```typescript
// middleware.ts or app/api/_error.ts
export function onError(error: Error, req: Request) {
  teleping.error(error.message, {
    path: new URL(req.url).pathname,
    stack: error.stack,
    method: req.method,
  })
}
```

### Daily digest via cron

```typescript
// app/api/cron/digest/route.ts
export async function GET() {
  await teleping.digest()
  // → 📋 Digest — 42 events
  //   ✅ 35 success  🔴 2 errors  ⚠️ 5 warnings
}
```

## Features

### Smart batching

50 signups in 5 minutes? One message, not 50:

```
✅ 50× New signup
━━━━━━━━━━━━━━━━━━━━━
50 events batched
━━━━━━━━━━━━━━━━━━━━━
myapp.com · 14:30
sent via teleping
```

### Quiet hours

```typescript
teleping.init({
  quietStart: 23,  // 11 PM
  quietEnd: 7,     // 7 AM
  timezone: 'America/New_York',
})
```

Non-critical notifications hold until morning. **Errors always go through.**

### Per-level routing

Route errors to a dedicated Telegram topic, metrics to a separate chat:

```typescript
teleping.init({
  chatId: '-100main_chat',
  routes: {
    error:  { threadId: '42' },                        // → #errors topic
    metric: { chatId: '-100metrics_chat' },             // → separate chat
  },
})
```

### Themes

```typescript
teleping.init({ theme: 'rich' })     // expandable blockquotes, code highlighting
teleping.init({ theme: 'minimal' })  // default — identical to v0.1
teleping.init({ theme: 'compact' })  // short separator, no bold
```

### Graceful degradation

No `TELEPING_TOKEN`? One `console.warn`. All calls become silent no-ops. Safe in tests, CI, and dev.

## Config reference

```typescript
teleping.init({
  token: 'bot_token',            // default: process.env.TELEPING_TOKEN
  chatId: 'chat_id',             // default: process.env.TELEPING_CHAT
  app: 'myapp.com',              // shown in every message footer
  timezone: 'America/New_York',  // for quiet hours
  quietStart: 23,                // hour 0–23
  quietEnd: 7,
  batchWindowMs: 300_000,        // dedup window, default 5 min
  theme: 'rich',                 // 'rich' | 'minimal' | 'compact'
  separator: '─────────────',    // override separator line
  footer: 'myapp v2.1 · prod',   // extra line above "sent via teleping"
  emoji: { error: '💥', success: '🚀' },  // override any level emoji
  routes: {
    error:  { chatId: '-100...', threadId: '42' },
    metric: { chatId: '-100...' },
  },
  buttons: {
    error:   ['cursor', 'claude'],  // add to every error message
    default: [],
  },
})
```

## API reference

### Core

| Method | When to use | Emoji |
|---|---|---|
| `teleping.log(label, data?)` | Server events, job complete | ℹ️ |
| `teleping.success(label, data?)` | Signup, payment, milestone | ✅ |
| `teleping.warn(label, data?)` | Rate limit, retry, degraded | ⚠️ |
| `teleping.error(label, data?)` | Exception, crash — always sends | 🔴 |
| `teleping.metric(label, value)` | Revenue, user count, latency | 📊 |
| `teleping.digest()` | Send stats summary, reset counters | 📋 |
| `teleping.init(config)` | Explicit config, overrides env | — |

### Components

| Method | Signature |
|---|---|
| `teleping.card(opts)` | `{ title, subtitle?, fields?, level?, actions? }` |
| `teleping.progress(label, opts)` | `label, { current, total, unit? }` |
| `teleping.table(title, rows)` | `title, { [col]: string \| number \| boolean }[]` |
| `teleping.checklist(title, items)` | `title, { label: string; done: boolean }[]` |

### Power user

```typescript
import { editMessage } from 'teleping'

// live-update a message (e.g. deploy progress → deploy complete)
await editMessage({ token, chatId, messageId, text: 'Deploy complete ✅' })
```

## CLI

```bash
npx teleping init   # guided setup — creates .env
npx teleping test   # sends a test message to verify config
```

---

<div align="center">

**built for solo builders who ship fast and want to see what's happening.**

[npm](https://npmjs.com/package/teleping) · [github](https://github.com/yerdaulet-damir/teleping) · [issues](https://github.com/yerdaulet-damir/teleping/issues)

</div>
