// Sandbox lab: the sliders and presets the Sandbox menu offers. Pure data; the sim applies them through the `lab` command.
import type { LabOp } from '../world'

export interface LabSlider { op: Extract<LabOp, 'fall' | 'ballSpeed' | 'tearGravity'>; label: string; min: number; max: number; step: number; value: number }
export const LAB_SLIDERS: readonly LabSlider[] = [
  { op: 'fall', label: 'Fall speed', min: 0, max: 3, step: .1, value: 1 },
  { op: 'ballSpeed', label: 'Ball speed', min: .5, max: 2, step: .05, value: 1 },
  { op: 'tearGravity', label: 'Tear gravity', min: 0, max: 3, step: .1, value: 1 },
]
export interface LabTool { op: Extract<LabOp, 'ball' | 'tear' | 'heal' | 'power' | 'clearBalls'>; label: string }
export const LAB_TOOLS: readonly LabTool[] = [
  { op: 'ball', label: 'Add a ball' }, { op: 'tear', label: 'Drop a tear' }, { op: 'heal', label: 'Mend the glass' },
  { op: 'power', label: 'Wake the pinball arm' }, { op: 'clearBalls', label: 'Clear extra balls' },
]
export interface LabPreset { id: string; name: string; note: string; ops: Array<{ op: LabOp; v?: number }> }
export const LAB_PRESETS: readonly LabPreset[] = [
  { id: 'calm', name: 'Calm', note: 'A slow fall and gentle balls.', ops: [{ op: 'fall', v: .4 }, { op: 'ballSpeed', v: .7 }, { op: 'tearGravity', v: .6 }] },
  { id: 'pressure', name: 'Pressure cooker', note: 'Fast fall, fast balls, three balls at once.', ops: [{ op: 'fall', v: 2.2 }, { op: 'ballSpeed', v: 1.5 }, { op: 'ball' }, { op: 'ball' }] },
  { id: 'rain', name: 'Tear rain', note: 'Light tears, plenty of them.', ops: [{ op: 'tearGravity', v: .3 }, { op: 'tear' }, { op: 'tear' }, { op: 'tear' }, { op: 'tear' }, { op: 'tear' }, { op: 'tear' }] },
  { id: 'reset', name: 'Back to normal', note: 'Every slider to its default.', ops: [{ op: 'fall', v: 1 }, { op: 'ballSpeed', v: 1 }, { op: 'tearGravity', v: 1 }, { op: 'clearBalls' }] },
]
