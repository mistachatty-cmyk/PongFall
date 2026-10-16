// The pause menu inside the match's own world. Pausing pulls the camera back from your arena and the choices appear as objects around it: the ball is
// Resume, a gear is Settings, a door leads out. Same interface as the old pause card (core/pauseMenu.ts), which stays as the fallback for ?menu=classic.
// Render-only: the sim is paused (or, online, keeps running) exactly as before; nothing here reaches it.
import type { PauseItem } from '../core/pauseMenu'
import { createWorldDialog, type DialogItem, type DialogOptions } from './worldDialog'
import type { ArtId } from './propArt'

export { pausePlacement, pauseZoom } from './worldDialog'

/** Which object stands for which pause choice. The first match wins; anything unknown becomes a book. */
const ART_FOR: [RegExp, ArtId][] = [
  [/^save/i, 'save'], [/^restart/i, 'restart'], [/arena sides/i, 'wardrobe'], [/^settings/i, 'gear'], [/keyboard/i, 'keys'], [/^music/i, 'jukebox'],
  [/^rules/i, 'book'], [/dev notes/i, 'cassette'], [/^(main menu|leave)/i, 'exit'], [/^reset/i, 'flask'],
]
export const artForPause = (label: string): ArtId => ART_FOR.find(([re]) => re.test(label))?.[1] ?? 'book'
/** Short names for the objects (the pause labels are written for buttons). */
const SHORT = (label: string): string => label.replace(/\s*\(.*\)\s*$/, '').replace(/^Rules and how it works$/, 'Rules').replace(/^Reset settings to defaults$/, 'Reset settings')

export interface PauseWorldOptions extends DialogOptions {
  /** One line about the match (mode, difficulty, score) drawn under the title. */
  info(): string
}

export function createPauseWorld(host: HTMLElement, canvas: HTMLCanvasElement, o: PauseWorldOptions) {
  const dlg = createWorldDialog(host, canvas, o)
  return {
    ...dlg,
    show(items: PauseItem[], title = 'Paused', sub = 'P or Esc to resume', _extra?: HTMLElement) {
      const list: DialogItem[] = items.map((it, i) => i === 0
        ? { label: it.label, run: it.run, kind: 'ball', value: 'GO', caption: SHORT(it.label).toUpperCase(), hint: it.hint ?? 'Back into the fall' }
        : { label: it.label, run: it.run, kind: 'prop', art: artForPause(it.label), caption: SHORT(it.label), hint: it.hint, danger: it.danger })
      dlg.present({ title, sub, info: o.info }, list)
    },
  }
}
export type PauseWorld = ReturnType<typeof createPauseWorld>
