// Names shown for the bots in other arenas. Deterministic from the arena and side, so they stay the same all match.
const FIRST = ['Wren', 'Orin', 'Mira', 'Kade', 'Isla', 'Tove', 'Nox', 'Juno', 'Pike', 'Sable', 'Ember', 'Lark', 'Rook', 'Vesper', 'Cinder', 'Moth']
export function botName(arenaId: number, side: 0 | 1): string {
  const n = Math.abs(arenaId * 2 + side)
  return `${FIRST[(n * 5 + 3) % FIRST.length]}-${((n * 37 + 11) % 90) + 10}`.toUpperCase()
}
export const arenaLetter = (id: number) => String.fromCharCode(66 + id)
/** Arena heading: "ARENA B", optionally with its crowned bot's name or both bots' names. */
export function arenaTitle(id: number, opts: { crowned?: 0 | 1 | null; names: boolean; over: boolean; target: number }): string {
  const base = `ARENA ${arenaLetter(id)}`
  if (opts.crowned != null) return `👑 ${base}${opts.names ? ` · ${botName(id, opts.crowned)}` : ''}`
  if (opts.names && !opts.over) return `${base} · ${botName(id, 0)} vs ${botName(id, 1)}`
  return `${base}${opts.over ? '' : ` · first to ${opts.target}`}`
}
