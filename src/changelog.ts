export interface ChangelogEntry { version: string; title: string; notes: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  { version: '0.1.0', title: 'First arena', notes: ['Single arena vs AI with breakable glass, falling field, eyes, tears, zoom.'] },
  { version: '0.1.1', title: 'Foundation', notes: ['Replayable runs (tick-stamped input), modes and modifiers as data, mount API, host interface, pause, local high score.'] },
]
export const CURRENT_VERSION = CHANGELOG[CHANGELOG.length - 1]!.version
