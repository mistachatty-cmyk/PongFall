// The dotted centre line is developer-controlled: it changes with the season, the mode or a live event, never from player settings.
// Rules are read top to bottom and the first match wins. Dates are month-day, inclusive, and may wrap the new year.
export interface CenterLineStyle { visible: boolean; dash: [number, number]; color: string; alpha: number; width: number }
export interface CenterLineRule { id: string; from?: string; to?: string; modes?: string[]; event?: string; style: Partial<CenterLineStyle> }

export const BASE_LINE: CenterLineStyle = { visible: true, dash: [14, 14], color: '#4aa8ff', alpha: .25, width: 3 }

export const CENTER_LINE_RULES: readonly CenterLineRule[] = [
  { id: 'live-event', event: 'live', style: { color: '#ffe08a', alpha: .4, dash: [6, 10] } },
  { id: 'winter', from: '12-01', to: '01-06', style: { color: '#dff2ff', alpha: .4, dash: [3, 12] } },
  { id: 'spooky', from: '10-20', to: '11-02', style: { color: '#ff9a3c', alpha: .38, dash: [10, 8] } },
  { id: 'solo', modes: ['solo-fall'], style: { visible: false } },
]

const md = (date: Date) => String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
const inRange = (day: string, from: string, to: string) => from <= to ? day >= from && day <= to : day >= from || day <= to

export function centerLineStyle(date: Date, mode: string, event?: string, rules: readonly CenterLineRule[] = CENTER_LINE_RULES): CenterLineStyle {
  const day = md(date)
  for (const r of rules) {
    if (r.event && r.event !== event) continue
    if (r.modes && !r.modes.includes(mode)) continue
    if (r.from && r.to && !inRange(day, r.from, r.to)) continue
    if (!r.event && !r.modes && !(r.from && r.to)) continue
    return { ...BASE_LINE, ...r.style }
  }
  return { ...BASE_LINE }
}
