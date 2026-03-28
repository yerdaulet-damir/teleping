# Contributing to teleping

Thanks for wanting to help make teleping better! Here's how.

## Quick start

```bash
git clone https://github.com/yerdaulet-damir/teleping.git
cd teleping
npm install
npm test        # 54 tests, should all pass
npm run build   # tsup → dist/
```

## Project structure

```
src/
  types.ts       — types (Level, PingrConfig, Message, etc.)
  send.ts        — raw Telegram Bot API fetch
  format.ts      — message formatting (emoji, separators, HTML)
  batch.ts       — smart batching with timer-based flushing
  teleping.ts       — Pingr class (the 5 methods + init + digest)
  index.ts       — public exports
  cli.ts         — CLI commands (init, test)
  __tests__/     — vitest tests
```

## Hard rules

These are non-negotiable:

- **Zero runtime dependencies.** Everything uses `fetch()`. No axios, no got, no node-fetch.
- **No dashboard / web UI.** Zero-dashboard is a feature.
- **No AI/LLM calls at runtime.** teleping is deterministic.
- **5 functions API surface.** Don't add new public methods without discussion.
- **Every message ends with `sent via teleping`.** Growth mechanic. Don't remove it.

## Development

```bash
npm run dev      # vitest watch mode
npm test         # run all tests once
npm run build    # build with tsup
npm run typecheck # tsc --noEmit
```

## Writing tests

Tests live in `src/__tests__/`. Every new feature needs tests. We use vitest.

```typescript
import { describe, expect, it } from 'vitest'

describe('myFeature', () => {
  it('does the thing', () => {
    expect(true).toBe(true)
  })
})
```

## Pull requests

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Run `npm test` and `npm run build` — both must pass
5. Commit with a clear message
6. Open a PR against `main`

Keep PRs small and focused. One feature or fix per PR.

## What to work on

Check [issues](https://github.com/yerdaulet-damir/teleping/issues) for things labeled `good first issue` or `help wanted`.

Ideas that would be great contributions:
- Better message formatting
- More real-world examples in README
- Performance improvements
- Better error messages

## Code style

- TypeScript, strict mode
- No semicolons (let prettier/editor handle it if you want them)
- Prefer `const` over `let`
- Prefer explicit types on public API, inferred internally
- Keep functions small and focused

## Questions?

Open an issue. We don't bite.
