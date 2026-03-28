#!/usr/bin/env node

import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { sendMessage } from './send.js'

// ─── ANSI colors ──────────────────────────────────────────────────────────────

const NO_COLOR = process.env['NO_COLOR'] !== undefined || !process.stdout.isTTY

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function clr(code: string, text: string): string {
  return NO_COLOR ? text : `${code}${text}${c.reset}`
}

const ok = (msg: string) => console.log(`  ${clr(c.green, '✓')} ${msg}`)
const err = (msg: string) => console.log(`  ${clr(c.red, '✗')} ${msg}`)
const info = (msg: string) => console.log(`  ${clr(c.cyan, '→')} ${msg}`)

// ─── Banner ───────────────────────────────────────────────────────────────────

const BANNER = [
  ' ████████╗███████╗██╗     ███████╗██████╗ ██╗███╗   ██╗ ██████╗ ',
  ' ╚══██╔══╝██╔════╝██║     ██╔════╝██╔══██╗██║████╗  ██║██╔════╝ ',
  '    ██║   █████╗  ██║     █████╗  ██████╔╝██║██╔██╗ ██║██║  ███╗',
  '    ██║   ██╔══╝  ██║     ██╔══╝  ██╔═══╝ ██║██║╚██╗██║██║   ██║',
  '    ██║   ███████╗███████╗███████╗██║     ██║██║ ╚████║╚██████╔╝',
  '    ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝ ',
]

function printBanner(): void {
  console.log()
  for (const line of BANNER) console.log(clr(c.green, line))
  console.log(clr(c.dim, '  beautiful telegram alerts for solo builders'))
  console.log()
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdInit(): Promise<void> {
  printBanner()

  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const content = (await import('node:fs')).readFileSync(envPath, 'utf-8')
    if (content.includes('TELEPING_TOKEN')) {
      info('TELEPING_TOKEN already in .env')
    } else {
      (await import('node:fs')).appendFileSync(envPath, '\n# teleping — telegram alerts\nTELEPING_TOKEN=\nTELEPING_CHAT=\n')
      ok('Added TELEPING_TOKEN and TELEPING_CHAT to .env')
    }
  } else {
    writeFileSync(envPath, '# teleping — telegram alerts\nTELEPING_TOKEN=\nTELEPING_CHAT=\n')
    ok('Created .env with TELEPING_TOKEN and TELEPING_CHAT')
  }

  console.log()
  info('Next steps:')
  console.log()
  console.log('  1. Create a Telegram bot: talk to @BotFather')
  console.log('  2. Copy the bot token → TELEPING_TOKEN')
  console.log('  3. Send /start to your bot, then get chat ID')
  console.log('  4. Copy the chat ID → TELEPING_CHAT')
  console.log()
  console.log(clr(c.dim, '  Then use in your code:'))
  console.log()
  console.log(`  ${clr(c.cyan, "import { teleping } from 'teleping'")}`)
  console.log(`  ${clr(c.cyan, "teleping.success('New user!', { email })")}`)
  console.log()
  console.log('  Run ' + clr(c.bold, 'npx teleping test') + ' to verify setup.')
  console.log()
}

async function cmdTest(): Promise<void> {
  printBanner()

  const token = process.env['TELEPING_TOKEN']
  const chatId = process.env['TELEPING_CHAT']

  if (!token || !chatId) {
    err('Missing TELEPING_TOKEN or TELEPING_CHAT in environment')
    info('Run ' + clr(c.bold, 'npx teleping init') + ' first')
    process.exit(1)
  }

  info('Sending test message...')
  console.log()

  const text = [
    '✅ <b>teleping is working!</b>',
    '━━━━━━━━━━━━━━━━━━━━━',
    'This is a test message from your dev machine.',
    'If you see this, your setup is correct.',
    '━━━━━━━━━━━━━━━━━━━━━',
    '<i>sent via teleping</i>',
  ].join('\n')

  try {
    const res = await sendMessage({ token, chatId, text })
    if (res.ok) {
      ok('Message sent! Check your Telegram.')
    } else {
      err(`Telegram API error: ${res.description ?? 'unknown'}`)
      process.exit(1)
    }
  } catch (e) {
    err(`Network error: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }

  console.log()
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const command = process.argv[2]

switch (command) {
  case 'init':
    cmdInit()
    break
  case 'test':
    cmdTest()
    break
  default:
    printBanner()
    console.log('  Usage:')
    console.log(`    ${clr(c.bold, 'teleping init')}   — set up .env`)
    console.log(`    ${clr(c.bold, 'teleping test')}   — send test message`)
    console.log()
    break
}
