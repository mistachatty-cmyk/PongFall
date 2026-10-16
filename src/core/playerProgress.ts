// What the player has earned so far, for unlocks that are shown or checked across the UI (companion personalities, UI themes).
import { localHistory } from './cloudSync'
import { loadProgress } from './progress'

export interface EarnedProgress { falls: number; wins: number }
export const earnedProgress = (): EarnedProgress => ({ falls: loadProgress().falls, wins: localHistory().filter(h => h.won).length })
