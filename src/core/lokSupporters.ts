import { sanitizeSupporterFeed, type SupporterEntry } from '../../lib/lok-universe/src/supporters'

export type LokSupporter = SupporterEntry

/** Keep only fields approved for the public thank-you ticker. */
export function sanitizeLokSupporters(data: unknown): LokSupporter[] {
  return sanitizeSupporterFeed(data)
}
