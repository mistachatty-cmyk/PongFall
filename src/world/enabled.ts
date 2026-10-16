/** Which menu style is on: the live world (menu, pause and results are objects in the shaft) or the original page menu. Both are fully supported. */
export type MenuStyle = 'world' | 'classic'
export const MENU_STYLES: ReadonlyArray<{ id: MenuStyle; name: string; note: string }> = [
  { id: 'world', name: 'Live world (experimental)', note: 'The menu, pause and results are objects in the falling shaft.' },
  { id: 'classic', name: 'Original menu', note: 'The page of buttons, as before.' },
]

/**
 * ?menu=classic or ?menu=world wins; then the saved setting; then the old pongfall.classicMenu key. Pure given the three inputs so it is tested.
 * Today's default is the live world until the owner decides otherwise.
 */
export function resolveMenuStyle(query: string | null, saved: unknown, legacyClassic: string | null): MenuStyle {
  if (query === 'classic' || query === 'world') return query
  if (saved === 'classic' || saved === 'world') return saved
  return legacyClassic === '1' ? 'classic' : 'world'
}

export function worldMenusOn(): boolean {
  let q: string | null = null, saved: unknown = null, legacy: string | null = null
  try { q = new URLSearchParams(location.search).get('menu') } catch { /* no location */ }
  try { saved = (JSON.parse(localStorage.getItem('pongfall.settings') ?? '{}') as { menuStyle?: unknown } | null)?.menuStyle } catch { /* no storage */ }
  try { legacy = localStorage.getItem('pongfall.classicMenu') } catch { /* no storage */ }
  return resolveMenuStyle(q, saved, legacy) === 'world'
}
