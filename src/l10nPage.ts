// Translates the standalone pages (public/rules.html, public/about.html) with the same catalogue and runtime as the game.
import { initAutoL10n } from './core/autoL10n'
import { resolveLocale } from '../lib/auto-l10n/src/index.js'

const CODES = ['en', 'es', 'fr', 'de', 'pt-BR', 'ja', 'ko', 'zh-CN']
let stored: string | null = null
try { stored = localStorage.getItem('pongfall.lang') } catch { /* private mode */ }
const want = stored ?? [...(navigator.languages ?? [navigator.language])].find(Boolean) ?? 'en'
const code = resolveLocale(want, CODES, 'en')
document.documentElement.lang = code
void initAutoL10n(code, { record: new URLSearchParams(location.search).get('l10n') === 'record' }).catch(() => null)
