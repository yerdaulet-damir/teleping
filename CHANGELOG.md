# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-28

### Added

- Five core methods: `log`, `success`, `warn`, `error`, `metric`
- Beautiful Telegram message formatting with emoji and separators
- Smart batching: duplicate events within 5min grouped into one message
- Quiet hours: suppress non-critical alerts during sleep (errors always punch through)
- `digest()` method: send accumulated stats summary
- Error action buttons: [Open in Cursor] and [Copy for Claude]
- `init()` for explicit configuration (token, chatId, app name, timezone)
- Graceful no-op when unconfigured (single console.warn, then silence)
- CLI: `npx teleping init` and `npx teleping test`
- Dual CJS/ESM build via tsup
- Zero runtime dependencies
- 54 tests across 3 test suites
