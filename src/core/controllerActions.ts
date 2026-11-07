import type { InputFrame } from '../../lib/lok-input/src/index.js'
import type { CommandInput } from '../sim/world'
/** Face-button actions use the same recorded command boundary as keyboard and touch. */
export function controllerActions(frame: InputFrame, ai: boolean, paused: boolean, armOut = false): CommandInput[] {
  if(paused || frame.player>1 || (frame.player===1 && ai))return []
  const side=frame.player as 0|1, commands:CommandInput[]=[]
  if(frame.pressed.power)commands.push({k:'power',side})
  if(frame.pressed.thrust && !armOut)commands.push({k:'thrust',side})
  return commands
}
