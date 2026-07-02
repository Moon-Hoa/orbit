import type { TleRecord } from './types'

const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php'

/**
 * Celestrak publishes TLEs on a schedule and doesn't update faster than this,
 * so caching client-side avoids hammering it on every reload/search.
 */
const CACHE_TTL_MS = 2 * 60 * 60 * 1000

/** Parses Celestrak's TLE text format: repeating groups of (name, line1, line2). */
export function parseTleText(text: string): TleRecord[] {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  const records: TleRecord[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim()
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    // TLE line 1, columns 3-7 (1-indexed): the NORAD catalog number.
    const noradId = line1.slice(2, 7).trim()
    records.push({ name, noradId, line1, line2 })
  }
  return records
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, fetchedAt } = JSON.parse(raw) as { data: T; fetchedAt: number }
    if (Date.now() - fetchedAt > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }))
  } catch {
    // localStorage unavailable or full - degrade to no caching, not fatal.
  }
}

async function fetchTleText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Celestrak request failed: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

/** Fetches a single satellite's TLE by its NORAD catalog number. */
export async function fetchByNoradId(noradId: string): Promise<TleRecord> {
  const cacheKey = `tle-cache:catnr:${noradId}`
  const cached = readCache<TleRecord>(cacheKey)
  if (cached) return cached

  const text = await fetchTleText(
    `${CELESTRAK_BASE_URL}?CATNR=${encodeURIComponent(noradId)}&FORMAT=TLE`,
  )
  const [record] = parseTleText(text)
  if (!record) {
    throw new Error(`No TLE found for NORAD ID ${noradId}`)
  }

  writeCache(cacheKey, record)
  return record
}

/** Searches Celestrak for satellites whose name contains `query` (case-insensitive substring). */
export async function searchByName(query: string): Promise<TleRecord[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  const cacheKey = `tle-cache:name:${normalizedQuery.toLowerCase()}`
  const cached = readCache<TleRecord[]>(cacheKey)
  if (cached) return cached

  const text = await fetchTleText(
    `${CELESTRAK_BASE_URL}?NAME=${encodeURIComponent(normalizedQuery)}&FORMAT=TLE`,
  )
  const records = parseTleText(text)

  writeCache(cacheKey, records)
  return records
}
