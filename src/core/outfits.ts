// Equipping and outfits: wear any item you own straight from the LokPack collection, and save whole looks (PongPainter slots, theme, Loksleeve, LilEye,
// arena side glass) as named outfits to switch between. Pure rules at the top (tested); the stores it touches are the existing ones.
import { PACK_ITEMS, packItemById, type PackItem } from './packItems'
import { packOwns } from './lokPack'
import { loadPainterSelection, savePainterSelection, type PainterSelection } from './pongPainter'
import { loadSleeve, saveSleeve, equipSleeve, type SleeveSelection, emptySleeve } from './packSleeve'
import { loadLilEye, saveLilEye } from './lilEye'
import { loadSettings, saveSettings } from './settingsStore'
import { loadSides, saveSides, PACK_PATTERNS } from './arenaSides'

export const OUTFITS_KEY = 'pongfall.outfits.v1', FAVS_KEY = 'pongfall.packfavs.v1', SEEN_KEY = 'pongfall.packseen.v1'
export const MAX_OUTFITS = 6
export interface Outfit { name: string; painter: PainterSelection; sleeve: SleeveSelection; lileye: { hat: string; aura: string; glasses: string; scarf: string; wings: string }; theme: string; sidePattern: string }

export const cleanOutfitName = (v: unknown): string => typeof v === 'string' ? v.replace(/[^\p{L}\p{N} '’-]/gu, '').trim().slice(0, 16) : ''
const strMap = (v: unknown): Record<string, string> => { const out: Record<string, string> = {}; if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (typeof x === 'string' && x.length < 60) out[k] = x; return out }

export function sanitizeOutfits(raw: unknown): Outfit[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((o): Outfit[] => {
    const r = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>, name = cleanOutfitName(r.name)
    if (!name) return []
    const li = strMap(r.lileye), sl = strMap(r.sleeve)
    return [{ name, painter: strMap(r.painter) as PainterSelection, sleeve: { packSkin: sl.packSkin ?? '', cardBack: sl.cardBack ?? '', cardFrame: sl.cardFrame ?? '' }, lileye: { hat: li.hat ?? '', aura: li.aura ?? '', glasses: li.glasses ?? '', scarf: li.scarf ?? '', wings: li.wings ?? '' }, theme: typeof r.theme === 'string' ? r.theme.slice(0, 40) : '', sidePattern: typeof r.sidePattern === 'string' ? r.sidePattern.slice(0, 20) : '' }]
  }).slice(0, MAX_OUTFITS)
}
/** Drop pack-only items you do not own from an outfit (an outfit saved on another device, or after a reset). */
export function ownedOutfit(o: Outfit, owns: (id: string) => boolean = packOwns): Outfit {
  const painter: PainterSelection = {}
  for (const [k, id] of Object.entries(o.painter)) { const it = id ? packItemById(id) : undefined; if (id && (!it || owns(id))) (painter as Record<string, string>)[k] = id }
  const keep = (id: string) => (id && owns(id) ? id : '')
  const needPat = (PACK_PATTERNS as Record<string, string>)[o.sidePattern]
  return { ...o, painter, sleeve: { packSkin: keep(o.sleeve.packSkin), cardBack: keep(o.sleeve.cardBack), cardFrame: keep(o.sleeve.cardFrame) }, lileye: { hat: keep(o.lileye.hat), aura: keep(o.lileye.aura), glasses: keep(o.lileye.glasses), scarf: keep(o.lileye.scarf), wings: keep(o.lileye.wings) }, theme: o.theme && packItemById(o.theme) && !owns(o.theme) ? '' : o.theme, sidePattern: needPat && !owns(needPat) ? 'none' : o.sidePattern }
}
export const toggleFav = (favs: readonly string[], id: string): string[] => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id].slice(-60)

type Store = Pick<Storage, 'getItem' | 'setItem'>
const store = (): Store | undefined => { try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined } }
const read = <T>(key: string, fallback: T, st = store()): unknown => { try { return JSON.parse(st?.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
const write = (key: string, v: unknown, st = store()): void => { try { st?.setItem(key, JSON.stringify(v)) } catch { /* storage unavailable */ } }
export const loadOutfits = (): Outfit[] => sanitizeOutfits(read(OUTFITS_KEY, []))
export const saveOutfits = (o: Outfit[]): void => write(OUTFITS_KEY, sanitizeOutfits(o))
const strs = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-200) : []
export const loadFavs = (): string[] => strs(read(FAVS_KEY, []))
export const saveFavs = (f: string[]): void => write(FAVS_KEY, f)
export const loadSeen = (): string[] => strs(read(SEEN_KEY, []))
export const saveSeen = (s: string[]): void => write(SEEN_KEY, s)

/** Wear one owned item. Returns false when it cannot be worn (not owned). */
export function equipItem(item: PackItem): boolean {
  if (!packOwns(item.id)) return false
  if (item.kind === 'painter' && item.painter) { const sel = loadPainterSelection(); (sel as Record<string, string>)[item.painter.slot] = item.id; savePainterSelection(sel) }
  else if (item.kind === 'theme') { const s = loadSettings(); s.uiTheme = item.id; saveSettings(s); if (typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-look')) }
  else if (item.kind === 'lileye' && item.lileye) { const l = loadLilEye({ falls: 99, wins: 99 }); (l as unknown as Record<string, string>)[item.lileye.slot] = item.id; saveLilEye(l); if (typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-lil-eye-changed')) }
  else if (item.kind === 'sleeve' && item.sleeve) saveSleeve(equipSleeve(loadSleeve(), item.sleeve.slot, item.id))
  else if (item.kind === 'sidebg' && item.sidebg) { const sd = loadSides(); sd.sides[0].pattern = item.sidebg.pattern as never; saveSides(sd) }
  else return false
  return true
}
/** Ids of the pack items you are wearing right now. */
export function equippedIds(): Set<string> {
  const ids = new Set<string>(), sel = loadPainterSelection() as Record<string, string | undefined>
  for (const it of PACK_ITEMS) if (it.painter && sel[it.painter.slot] === it.id) ids.add(it.id)
  const sl = loadSleeve(); for (const id of Object.values(sl)) if (id) ids.add(id)
  const li = loadLilEye({ falls: 99, wins: 99 }); for (const id of [li.hat, li.aura, li.glasses, li.scarf, li.wings]) if (id) ids.add(id)
  ids.add(loadSettings().uiTheme)
  const pat = loadSides().sides[0].pattern, pid = (PACK_PATTERNS as Record<string, string>)[pat]; if (pid) ids.add(pid)
  return ids
}
export function captureOutfit(name: string): Outfit {
  const li = loadLilEye({ falls: 99, wins: 99 })
  return { name: cleanOutfitName(name) || 'Outfit', painter: { ...loadPainterSelection() }, sleeve: { ...loadSleeve() }, lileye: { hat: li.hat, aura: li.aura, glasses: li.glasses, scarf: li.scarf, wings: li.wings }, theme: loadSettings().uiTheme, sidePattern: loadSides().sides[0].pattern }
}
export function applyOutfit(o: Outfit): void {
  const w = ownedOutfit(o)
  savePainterSelection(w.painter)
  saveSleeve({ ...emptySleeve(), ...w.sleeve })
  const l = loadLilEye({ falls: 99, wins: 99 }); Object.assign(l, w.lileye); saveLilEye(l)
  const s = loadSettings(); if (w.theme) s.uiTheme = w.theme; saveSettings(s)
  const sd = loadSides(); sd.sides[0].pattern = (w.sidePattern || 'none') as never; saveSides(sd)
  if (typeof window !== 'undefined') for (const e of ['pongfall-look', 'pongfall-lil-eye-changed']) window.dispatchEvent(new Event(e))
}
