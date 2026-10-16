// The end-of-match choices inside the match's own world. When a match finishes the camera pulls back and the choices are objects around your arena:
// the ball on the floor plays again, a floppy disk saves the replay, a door goes back to the menu. The winning point is two balls hanging side by side:
// WIN or AT WHAT COST. Same interface as the old card (core/endScreen.ts), which stays as the fallback for ?menu=classic.
import type { GameResult } from '../sim/result'
import { endWords } from '../core/endScreen'
import { createWorldDialog, type DialogItem, type DialogOptions } from './worldDialog'

export interface EndWorldOptions extends DialogOptions {
  onRetry(): void; onMenu(): void; onSaveReplay?(): void; onTakeWin?(): void; onOvertime?(): void; menuAvailable(): boolean; online?: boolean
  /** Unopened LokPacks, and the page that opens them. */
  packs?(): number; onPacks?(): void
}

export function createEndWorld(host: HTMLElement, canvas: HTMLCanvasElement, d: EndWorldOptions) {
  const dlg = createWorldDialog(host, canvas, d, 'end-cover')
  const menu = (label = 'Main menu'): DialogItem[] => d.menuAvailable() ? [{ label, run: d.onMenu, kind: 'prop', art: 'exit', caption: label, hint: 'Back to the menu' }] : []
  return {
    ...dlg,
    show(result: GameResult | null = null) {
      const w = endWords(result)
      dlg.present(
        { kicker: w.kicker, title: w.title, copy: w.copy, recap: w.recap.map(r => `${r.label} ${r.value}`) },
        [
          { label: d.online ? 'Request rematch' : 'Play again', run: d.onRetry, kind: 'ball', value: d.online ? 'REMATCH' : 'AGAIN', caption: d.online ? 'REQUEST REMATCH' : 'PLAY AGAIN', hint: d.online ? 'Ask for a rematch' : 'Another fall' },
          ...(d.onSaveReplay && !d.online ? [{ label: 'Save replay', run: d.onSaveReplay, kind: 'prop', art: 'save', caption: 'Save replay', hint: 'Keep this match to watch again' } satisfies DialogItem] : []),
          ...((d.packs?.() ?? 0) > 0 && d.onPacks ? [{ label: 'Open LokPack', run: d.onPacks, kind: 'prop', art: 'pack', caption: `LokPack${(d.packs?.() ?? 0) > 1 ? ` ×${d.packs?.()}` : ''}`, hint: 'You earned a pack: open it' } satisfies DialogItem] : []),
          ...menu(),
        ],
        { focus: true },
      )
    },
    showDecision() {
      dlg.present(
        { kicker: 'YOU SCORED THE WINNING POINT', title: 'THE CORD IS HOLDING', copy: 'Bank your victory now, or risk it in Power Mode overtime. First to 6 wins. If the other side scores 6 first, this win is gone.' },
        [
          { label: 'Win: bank the victory', run: () => d.onTakeWin?.(), kind: 'ball', value: 'WIN', caption: 'BANK THE VICTORY', tint: '#8affc1', hint: 'Take the win now' },
          { label: 'At what cost? Start Power Mode overtime, first to six', run: () => d.onOvertime?.(), kind: 'ball', value: '?', caption: 'AT WHAT COST?', tint: '#ff9a86', danger: true, hint: 'Risk it all in overtime' },
        ],
        { focus: true, drop: true, escape: () => d.onTakeWin?.() },
      )
    },
    showWaiting() {
      dlg.present(
        { kicker: 'REMATCH REQUESTED', title: 'Waiting for the other player', copy: 'The rematch begins when both players accept. You can return to the menu at any time.' },
        [{ label: 'Cancel and go to the main menu', run: d.onMenu, kind: 'ball', value: 'X', caption: 'CANCEL · MAIN MENU', danger: true }],
        { focus: true, escape: d.onMenu },
      )
    },
    showSandboxExit() {
      dlg.present(
        { kicker: 'SANDBOX', title: 'Leave this run?', copy: 'Sandbox has no finish line. Leaving ends this free-play session and returns to the menu.' },
        [{ label: 'Keep playing', run: () => dlg.hide(), kind: 'ball', value: 'GO', caption: 'KEEP PLAYING' }, ...menu()],
        { focus: true, escape: () => dlg.hide() },
      )
    },
  }
}
export type EndWorld = ReturnType<typeof createEndWorld>
