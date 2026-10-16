/** The menus as a live world (default since 0.40.0). ?menu=classic or localStorage pongfall.classicMenu=1 brings back the old pages of buttons and the pause card. */
export function worldMenusOn(): boolean {
  let q = ''
  try { q = new URLSearchParams(location.search).get('menu') ?? '' } catch { /* no location */ }
  if (q === 'classic') return false
  try { return localStorage.getItem('pongfall.classicMenu') !== '1' } catch { return true }
}
