<div align="center">

```
 ████████╗███████╗██╗     ███████╗██████╗ ██╗███╗   ██╗ ██████╗
 ╚══██╔══╝██╔════╝██║     ██╔════╝██╔══██╗██║████╗  ██║██╔════╝
    ██║   █████╗  ██║     █████╗  ██████╔╝██║██╔██╗ ██║██║  ███╗
    ██║   ██╔══╝  ██║     ██╔══╝  ██╔═══╝ ██║██║╚██╗██║██║   ██║
    ██║   ███████╗███████╗███████╗██║     ██║██║ ╚████║╚██████╔╝
    ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝
```

**beautiful telegram alerts for your app.**<br>
like `console.log` but it arrives on your phone.

[![npm](https://img.shields.io/npm/v/teleping?color=3ECF8E&style=flat-square)](https://npmjs.com/package/teleping)
[![tests](https://img.shields.io/github/actions/workflow/status/yerdaulet-damir/teleping/ci.yml?label=tests&style=flat-square)](https://github.com/yerdaulet-damir/teleping/actions)
[![license](https://img.shields.io/badge/license-MIT-3ECF8E.svg?style=flat-square)](LICENSE)
[![bundle](https://img.shields.io/bundlephobia/minzip/teleping?color=3ECF8E&style=flat-square)](https://bundlephobia.com/package/teleping)
[![zero deps](https://img.shields.io/badge/dependencies-0-3ECF8E?style=flat-square)](#)

</div>

---

```typescript
// before teleping: you're blind
// you learn about problems from your users

// after teleping: you see everything
import { teleping } from 'teleping'

teleping.success('New user!', { email: 'alex@startup.com', plan: 'pro' })
teleping.error('Payment failed', { amount: 15, reason: 'card_declined' })

// your phone knows everything that happens in your product
```

<div align="center">

<!-- TODO: replace with real Telegram screenshot -->
<pre>
✅ <b>New user!</b>
━━━━━━━━━━━━━━━
email    alex@startup.com
plan     pro
━━━━━━━━━━━━━━━
myapp.com · 14:23
<i>sent via teleping</i>
</pre>

</div>

## Why

You built a SaaS. Supabase, Vercel, Stripe — works great. But you're blind. You don't see who signed up, who paid, what broke. You find out when you open dashboards. Which is never in time.

**teleping makes your app talk to you on Telegram.** One import. Five functions. Every signup, payment, and error — on your phone. Beautifully formatted.

```
shadcn/ui   → beautiful components in 1 line
prisma      → beautiful database in 1 line
teleping    → beautiful alerts in 1 line
```

## Install

```bash
npm install teleping
```

## Setup (30 seconds)

1. Message [@BotFather](https://t.me/BotFather) on Telegram, create a bot, copy the token
2. Send `/start` to your bot, get your chat ID
3. Add to `.env`:

```env
TELEPING_TOKEN=your_bot_token
TELEPING_CHAT=your_chat_id
```

Or run `npx teleping init` to generate the `.env` automatically.

## Usage

```typescript
import { teleping } from 'teleping'

// five functions. that's the whole API.
teleping.log('Server started', { port: 3000 })
teleping.success('New user!', { email, plan })
teleping.warn('Rate limit hit', { ip, endpoint })
teleping.error('Payment failed', { error: err.message, userId })
teleping.metric('Monthly revenue', 4500)
```

### What you see on Telegram

```
✅ New user!
━━━━━━━━━━━━━━━
email    alex@startup.com
plan     pro
source   producthunt
━━━━━━━━━━━━━━━
myapp.com · 14:23
sent via teleping
```

```
🔴 Payment failed
━━━━━━━━━━━━━━━
error    Stripe timeout
file     payments.ts:89
userId   usr_abc123
━━━━━━━━━━━━━━━
myapp.com · 02:14
sent via teleping

[Open in Cursor]  [Copy for Claude]
```

```
📊 Monthly revenue: 4500
━━━━━━━━━━━━━━━
myapp.com · 14:23
sent via teleping
```

## Real-world examples

### Next.js + Supabase auth

```typescript
// app/api/auth/callback/route.ts
import { teleping } from 'teleping'

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
import { teleping } from 'teleping'

export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(body, sig, secret)

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      teleping.success('New payment', {
        amount: `$${session.amount_total / 100}`,
        email: session.customer_email,
        plan: session.metadata.plan,
      })
      break

    case 'charge.failed':
      teleping.error('Payment failed', {
        amount: `$${event.data.object.amount / 100}`,
        reason: event.data.object.failure_message,
      })
      break
  }
}
```

### Global error handler

```typescript
// middleware.ts or error boundary
import { teleping } from 'teleping'

export function onError(error: Error, req: Request) {
  teleping.error(error.message, {
    path: new URL(req.url).pathname,
    stack: error.stack,
    method: req.method,
  })
}
```

### Daily digest

```typescript
// triggered by cron or Vercel cron job
import { teleping } from 'teleping'

export async function GET() {
  await teleping.digest()
  // sends: 📋 Digest — 42 events
  //        ✅ 35 success | 🔴 2 errors | ⚠️ 5 warnings
}
```

## Features

### Smart batching

50 signups in 5 minutes? You get ONE message, not 50:

```
✅ 50× New signup
━━━━━━━━━━━━━━━
50 events batched
━━━━━━━━━━━━━━━
myapp.com · 14:30
sent via teleping
```

### Quiet hours

```typescript
teleping.init({
  app: 'myapp.com',
  quietStart: 23,  // 11 PM
  quietEnd: 7,     // 7 AM
  timezone: 'America/New_York',
})
```

Non-critical notifications are held until morning. **Errors always punch through.**

### Error buttons

Error messages include action buttons:
- **Open in Cursor** — jumps to the exact file:line from the stack trace
- **Copy for Claude** — pre-fills Claude with the error context

### Graceful degradation

No `TELEPING_TOKEN`? No crash. Just a single `console.warn` and all calls become no-ops. Safe in CI, tests, and development.

## API

| Method | Description | Emoji |
|---|---|---|
| `teleping.log(label, data?)` | General info | ℹ️ |
| `teleping.success(label, data?)` | Something good happened | ✅ |
| `teleping.warn(label, data?)` | Heads up | ⚠️ |
| `teleping.error(label, data?)` | Something broke (always sends) | 🔴 |
| `teleping.metric(label, value)` | Track a number | 📊 |
| `teleping.digest()` | Send summary, reset counters | 📋 |
| `teleping.init(config)` | Explicit configuration | — |

### `teleping.init(config)`

```typescript
teleping.init({
  token: 'bot_token',          // default: process.env.TELEPING_TOKEN
  chatId: 'chat_id',           // default: process.env.TELEPING_CHAT
  app: 'myapp.com',            // shown in message footer
  timezone: 'Europe/London',   // for quiet hours
  quietStart: 23,              // hour (0-23)
  quietEnd: 7,                 // hour (0-23)
  batchWindowMs: 300000,       // 5 min default
})
```

## CLI

```bash
npx teleping init   # creates .env with TELEPING_TOKEN + TELEPING_CHAT
npx teleping test   # sends a test message to verify setup
```

## Why not just write a bot?

| DIY bot (30 lines) | teleping |
|---|---|
| `bot.sendMessage(chatId, 'error: ' + err)` | `teleping.error('API crashed', { path, error })` |
| ugly plain text | beautiful formatting with emoji + separators |
| 50 errors = 50 messages = phone explodes | 50 identical errors = 1 message |
| wakes you at 3 AM for everything | quiet hours: errors only at night |
| no action buttons | [Open in Cursor] [Copy for Claude] |
| no daily summary | `teleping.digest()` |
| write from scratch for every project | `npm install teleping` + 1 import |
| zero formatting decisions | shadcn-level taste built in |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

---

<div align="center">

**built for solo builders who ship fast and want to see what's happening.**

[npm](https://npmjs.com/package/teleping) · [github](https://github.com/yerdaulet-damir/teleping) · [issues](https://github.com/yerdaulet-damir/teleping/issues)

</div>
