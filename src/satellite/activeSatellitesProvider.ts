import { parseTleText, readCache, readCacheIgnoringTtl, writeCache } from './celestrakProvider'
import type { TleRecord } from './types'

const CELESTRAK_ACTIVE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=TLE'
const CACHE_KEY = 'tle-cache:group:active'

/**
 * Fetches every currently-active satellite from Celestrak (~16,000 as of writing, and growing
 * over time - e.g. Starlink expansion). Cached as the raw TLE text (not parsed records) via
 * `celestrakProvider.ts`'s existing cache helpers, so the stored payload stays close to its
 * original size (~2.7MB) rather than ballooning through per-record JSON overhead.
 *
 * Celestrak rate-limits repeat downloads of the same GROUP within its ~2h publish cadence - a 403
 * with a plain-text "hasn't updated since your last download" body, not a CORS/auth failure
 * (confirmed by hitting it directly). So on any fetch failure, this falls back to whatever's
 * cached even if past its normal TTL, rather than surfacing a hard error - it only throws if the
 * fetch failed and there's truly nothing cached yet.
 */
export async function fetchActiveSatellites(): Promise<TleRecord[]> {
  const cachedText = readCache<string>(CACHE_KEY)
  if (cachedText !== null) return parseTleText(cachedText)

  try {
    const response = await fetch(CELESTRAK_ACTIVE_URL)
    if (!response.ok) {
      throw new Error(`Celestrak request failed: ${response.status} ${response.statusText}`)
    }
    const text = await response.text()
    writeCache(CACHE_KEY, text)
    return parseTleText(text)
  } catch (error) {
    const staleText = readCacheIgnoringTtl<string>(CACHE_KEY)
    if (staleText !== null) return parseTleText(staleText)
    throw error
  }
}
