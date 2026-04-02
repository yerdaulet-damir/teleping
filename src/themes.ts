import type { Theme } from './types.js'

// ─── Theme definitions ────────────────────────────────────────────────────────

export interface ThemeDefinition {
  separator: string
  dataFormat: 'flat' | 'blockquote' | 'expandable-blockquote'
  headerBold: boolean
  footerItalic: boolean
  stackFormat: 'code' | 'plain'
}

export const THEMES: Record<Theme, ThemeDefinition> = {
  rich: {
    separator: '━━━━━━━━━━━━━━━━━━━━━',
    dataFormat: 'expandable-blockquote',
    headerBold: true,
    footerItalic: true,
    stackFormat: 'code',
  },
  minimal: {
    separator: '━━━━━━━━━━━━━━━━━━━━━',
    dataFormat: 'flat',
    headerBold: true,
    footerItalic: true,
    stackFormat: 'plain',
  },
  compact: {
    separator: '·',
    dataFormat: 'flat',
    headerBold: false,
    footerItalic: false,
    stackFormat: 'plain',
  },
}

// DEFAULT_THEME produces identical output to v0.1 — zero visual regression
export const DEFAULT_THEME = THEMES.minimal
