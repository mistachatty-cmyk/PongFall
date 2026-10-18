// Easter egg: "The eyes are watching". Type WATCHME on the title screen or the menu and the background eyes on the title screen start to follow your cursor.
// Local to this device, render-only; the Eyes follow the cursor setting and Reduce Motion still switch it off.
export const WATCH_SEQUENCE = 'watchme'
export const WATCH_KEY = 'pongfall.egg.watching'
type Store = Pick<Storage, 'getItem' | 'setItem'>
const store = (): Store | undefined => { try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined } }
export const watchingUnlocked = (s: Pick<Storage, 'getItem'> | undefined = store()): boolean => { try { return s?.getItem(WATCH_KEY) === '1' } catch { return false } }
export function unlockWatching(s: Pick<Storage, 'setItem'> | undefined = store()): boolean { try { s?.setItem(WATCH_KEY, '1'); return !!s } catch { return false } }
/** Pure: feed one typed letter into the buffer and say whether the word was just completed. */
export function feedSecret(buffer: string, key: string, word = WATCH_SEQUENCE): { buffer: string; hit: boolean } {
  const next = (buffer + key.toLowerCase()).slice(-Math.max(word.length, 16))
  return next.endsWith(word) ? { buffer: '', hit: true } : { buffer: next, hit: false }
}
