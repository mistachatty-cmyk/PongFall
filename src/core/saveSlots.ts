import { Replay, runReplay } from '../sim/replay'

export interface SaveSlot { id: string; name: string; savedAt: number; replay: Replay }
const KEY = 'pongfall.saveSlots.v1'

export function listSaveSlots(): SaveSlot[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is SaveSlot => !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.name === 'string' && Number.isFinite(x.savedAt) && !!x.replay).sort((a, b) => b.savedAt - a.savedAt)
  } catch { return [] }
}

export function saveSlot(name: string, replay: Replay): SaveSlot {
  const clean = name.trim().slice(0, 48)
  if (!clean) throw new Error('Give this save a name.')
  const slot = { id: crypto.randomUUID(), name: clean, savedAt: Date.now(), replay }
  localStorage.setItem(KEY, JSON.stringify([slot, ...listSaveSlots()]))
  void import('./cloudSync').then(m => m.queueCloudSync())
  return slot
}

export function deleteSaveSlot(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(listSaveSlots().filter(s => s.id !== id)))
  // Keep the deletion pending before an account sync can pull this slot back.
  const key = 'pongfall.saveDeleted.v1'
  let old: string[] = []
  try { const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); if (Array.isArray(parsed)) old = parsed.filter((x): x is string => typeof x === 'string') } catch { /* old tombstones are malformed */ }
  localStorage.setItem(key, JSON.stringify([...new Set([...old, id])]))
  void import('./cloudSync').then(m => m.queueCloudSync())
}

/** Validate without removing old saves: a later sim may be unable to replay them. */
export function loadSaveSlot(slot: SaveSlot): Replay {
  try { runReplay(slot.replay); return slot.replay }
  catch (e) { throw new Error(`Cannot load “${slot.name}”: ${e instanceof Error ? e.message : 'incompatible save'}. The save is still here.`) }
}
