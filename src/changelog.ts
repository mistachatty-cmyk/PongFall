export interface ChangelogEntry { version: string; title: string; notes: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.1.0', title: 'First arena', notes: ['Single arena vs AI with breakable glass, falling field, eyes, tears, zoom.'] },
  { version: '0.1.1', title: 'Foundation', notes: ['Replayable runs (tick-stamped input), modes and modifiers as data, mount API, host interface, pause, local high score.'] },
  { version: '0.1.2', title: 'Online', notes: ['Vercel deploy config, public updates feed for gsix.online.'] },
  { version: '0.2.0', title: 'Physics feel pass', notes: ['Thrust: Space or double-tap lunges your paddle and hands its speed to the ball.', 'Arena sways and tilts with impacts; wind blows the tears; the fall eases and surges.', 'Slice tears like fruit (mouse drag or touch swipe); tears are bigger and slower.', 'Plain walls no longer open eyes or drop tears; background eyes start closed and react.', 'Fog, falling parallax and speed streaks.', 'Procedural sound: falling air, eye squish, glass, thrust. M mutes.', 'Four NPC difficulties (Chill by default) and an easier start.', 'Settings button: difficulty, mode, volume.'] },
]
export const CURRENT_VERSION = CHANGELOG[CHANGELOG.length - 1]!.version
