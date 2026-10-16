// The Loksleeve: how your LokPacks, card backs and cards look. Modelled on 616 Survivor's Neon Sleeve, which has three kinds of cosmetic with one equipped
// per kind (pack wrap, card back, card frame). Here the kinds are data (SLEEVE_ITEMS in packItems.ts), found in LokPacks, and swapping what is inside a
// sleeve is only changing which id is equipped. Render-only; the art is in packSleeveArt.ts.
import { SLEEVE_DEFAULTS, SLEEVE_ITEMS, type PackItem, type SleeveSlot, type SleeveSpec } from './packItems'
import { packOwns } from './lokPack'

export const SLEEVE_KEY = 'pongfall.sleeve.v1'
export const SLEEVE_SLOTS: readonly { slot: SleeveSlot; label: string; blurb: string }[] = [
  { slot: 'packSkin', label: 'Pack wrap', blurb: 'How a LokPack looks before you open it.' },
  { slot: 'cardBack', label: 'Card back', blurb: 'The face-down side while a pack opens.' },
  { slot: 'cardFrame', label: 'Card frame', blurb: 'The layout and border of a collected card.' },
]
export type SleeveSelection = Record<SleeveSlot, string>
export const emptySleeve = (): SleeveSelection => ({ packSkin: '', cardBack: '', cardFrame: '' })

export const sleeveItemsOf = (slot: SleeveSlot): PackItem[] => SLEEVE_ITEMS.filter(i => i.sleeve?.slot === slot)
/** Keep an equipped id only if it is a real item for that slot that you own. */
export function sanitizeSleeve(raw: unknown, owns: (id: string) => boolean = packOwns): SleeveSelection {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, out = emptySleeve()
  for (const { slot } of SLEEVE_SLOTS) { const id = r[slot]; if (typeof id === 'string' && sleeveItemsOf(slot).some(i => i.id === id) && owns(id)) out[slot] = id }
  return out
}
type Store = Pick<Storage, 'getItem' | 'setItem'>
const store = (): Store | undefined => { try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined } }
export function loadSleeve(storage: Pick<Storage, 'getItem'> | undefined = store(), owns?: (id: string) => boolean): SleeveSelection {
  try { return sanitizeSleeve(JSON.parse(storage?.getItem(SLEEVE_KEY) ?? 'null'), owns) } catch { return emptySleeve() }
}
export function saveSleeve(s: SleeveSelection, storage: Store | undefined = store()): boolean {
  try { storage?.setItem(SLEEVE_KEY, JSON.stringify(sanitizeSleeve(s, () => true))); if (typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-sleeve')); return !!storage } catch { return false }
}
/** Equip an item (or '' for the plain starter). Returns the new selection. */
export function equipSleeve(s: SleeveSelection, slot: SleeveSlot, id: string): SleeveSelection { return { ...s, [slot]: id } }
/** What to draw for a slot: the equipped item's spec, or the plain starter. */
export function sleeveSpec(s: SleeveSelection, slot: SleeveSlot): SleeveSpec {
  const it = s[slot] ? SLEEVE_ITEMS.find(i => i.id === s[slot]) : undefined
  return it?.sleeve ?? SLEEVE_DEFAULTS[slot]
}
