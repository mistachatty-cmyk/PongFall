// Localization through the LOK standard (auto-l10n). English lives in src/locales/en.json; the other languages are written by the
// auto-translate workflow and are never edited by hand here. `t()` falls back to English, then to the key, so a gap is visible but never blank.
import { createL10n, resolveLocale } from '../../lib/auto-l10n/src/index.js'
import en from '../locales/en.json'

export const LANG_KEY = 'pongfall.lang'
/** English plus the targets in l10n.config.json. A language shows up here only when its file exists (see availableLanguages). */
export const LANGUAGES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'pt-BR', name: 'Português (Brasil)' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'zh-CN', name: '简体中文' },
]
export type MessageKey = keyof typeof en

export const l10n = createL10n<MessageKey>({
  defaultLocale: 'en',
  messages: { en },
  supported: LANGUAGES.map(l => l.code),
  loadLocale: async code => (await import(`../locales/${code}.json`)).default,
})

/** Translate a key. Typed: a key that is not in en.json fails the typecheck. */
export const t = (key: MessageKey, vars?: Record<string, unknown>): string => l10n.t(key, vars)

/** Pick the starting language: the saved choice, then the browser's list, then English. Safe to call before first paint. */
export async function initLanguage(): Promise<string> {
  let stored: string | null = null
  try { stored = localStorage.getItem(LANG_KEY) } catch { /* private mode */ }
  const langs = typeof navigator !== 'undefined' ? [...(navigator.languages ?? [navigator.language])] : []
  const want = stored ?? langs.find(Boolean) ?? 'en'
  return l10n.setLocale(resolveLocale(want, LANGUAGES.map(l => l.code), 'en'))
}

/** Save the choice and reload so every screen is built in the new language. */
export function chooseLanguage(code: string): void {
  try { localStorage.setItem(LANG_KEY, code) } catch { /* the reload still applies it for this visit via the URL-less default */ }
  if (typeof location !== 'undefined') location.reload()
}
