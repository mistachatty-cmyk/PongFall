export interface LokSupporter { display: string; tier: 'pass' | 'passport' | 'lifetime'; founder: boolean }

/** Keep only fields approved for the public thank-you ticker. */
export function sanitizeLokSupporters(data: unknown): LokSupporter[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object') return []
    const item = row as Record<string, unknown>
    if (typeof item.display !== 'string' || !['pass', 'passport', 'lifetime'].includes(String(item.tier))) return []
    const display = item.display.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 32)
    return display ? [{ display, tier: item.tier as LokSupporter['tier'], founder: item.founder === true }] : []
  })
}
