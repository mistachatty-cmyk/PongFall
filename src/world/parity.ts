// Both menus must reach every feature. Each row names where a feature lives in the live-world menu and what marks it in the original menu's source.
// parity.test.ts fails when a world object has no row, or the original menu loses a marker.
import type { PropId } from './menuModel'

export interface Feature { id: string; world: `prop:${PropId}` | 'ball' | `sign:${string}`; /** A string that must appear in src/core/mainMenu.ts or src/main.ts. */ classic: string }
export const FEATURES: readonly Feature[] = [
  { id: 'play', world: 'ball', classic: "t('menu.play')" },
  { id: 'mode', world: 'sign:mode', classic: "t('menu.mode')" },
  { id: 'difficulty', world: 'sign:difficulty', classic: "t('menu.difficulty')" },
  { id: 'other-arenas', world: 'sign:arenas', classic: "t('menu.otherArenas')" },
  { id: 'music', world: 'prop:jukebox', classic: 'musicPanel.open' },
  { id: 'settings', world: 'prop:gear', classic: 'settings' },
  { id: 'stats', world: 'prop:stats', classic: "t('menu.viewStats')" },
  { id: 'painter', world: 'prop:easel', classic: "t('menu.painter')" },
  { id: 'arena-sides', world: 'prop:wardrobe', classic: "t('menu.sides')" },
  { id: 'lileye', world: 'prop:eye', classic: "t('menu.lilEye')" },
  { id: 'multiplayer', world: 'prop:door', classic: "t('menu.multiplayer')" },
  { id: 'saved-matches', world: 'prop:cassette', classic: "t('menu.savedMatches')" },
  { id: 'lokpacks', world: 'prop:pack', classic: 'mountLokPacks' },
  { id: 'game-lab', world: 'prop:flask', classic: 'Game Lab' },
]
