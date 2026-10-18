// Reading and saving the player's settings, shared by the game, the menus and the world menu.
import { MODES } from '../sim/data/modes'
import { DIFFICULTIES } from '../sim/data/difficulty'
import { SETTINGS_KEY, defaultSettings, sanitizeSettings, type Settings } from './settings'
import { queueCloudSync } from './cloudSyncQueue'

/** Reduce Motion starts off for everyone; the player turns it on in Settings (an explicit saved choice is always kept). */
const osReduce = () => false
const valid = { modes: Object.keys(MODES), difficulties: Object.keys(DIFFICULTIES) }
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    if (raw) return sanitizeSettings(raw, valid, osReduce())
    // older versions kept these separately
    const legacy: Record<string, unknown> = {}
    const d = localStorage.getItem('pongfall.difficulty'); if (d) legacy.difficulty = d
    const r = localStorage.getItem('pongfall.reduceMotion'); if (r !== null) legacy.reduceMotion = r === '1'
    return sanitizeSettings(legacy, valid, osReduce())
  } catch { return defaultSettings(osReduce()) }
}
export const saveSettings = (s: Settings) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); localStorage.setItem('pongfall.settingsTouchedAt', String(Date.now())); queueCloudSync() } catch { /* ignore */ } }

