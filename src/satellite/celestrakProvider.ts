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

export type TleParseResult = { ok: true; record: TleRecord } | { ok: false; error: string }

/** Sum of digits (dashes count as 1, everything else as 0), mod 10 - the standard TLE line checksum. */
function tleChecksum(line: string): number {
  let sum = 0
  for (const ch of line.slice(0, -1)) {
    if (ch >= '0' && ch <= '9') sum += Number(ch)
    else if (ch === '-') sum += 1
  }
  return sum % 10
}

/**
 * Parses a single manually-pasted TLE: either the 3-line form (name + line 1
 * + line 2, what Celestrak returns) or the bare 2-line form (no name line,
 * common when TLEs are shared standalone) - falling back to a placeholder
 * name derived from the NORAD ID in that case. Validates line prefixes,
 * length, matching NORAD IDs between the two lines, and each line's checksum,
 * so a garbled paste is rejected here with a specific reason rather than
 * failing deep inside satellite.js's propagation path.
 */
export function parseTleBlock(text: string): TleParseResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let name: string | undefined
  let line1: string
  let line2: string

  if (lines.length === 2) {
    ;[line1, line2] = lines
  } else if (lines.length === 3) {
    ;[name, line1, line2] = lines
  } else {
    return { ok: false, error: `Expected 2 lines (no name) or 3 lines (with name), got ${lines.length}.` }
  }

  if (!line1.startsWith('1 ')) return { ok: false, error: 'Line 1 must start with "1 ".' }
  if (!line2.startsWith('2 ')) return { ok: false, error: 'Line 2 must start with "2 ".' }

  if (line1.length < 68 || line1.length > 69 || line2.length < 68 || line2.length > 69) {
    return { ok: false, error: 'Each line should be 68-69 characters long.' }
  }

  // TLE columns 3-7 (1-indexed): the NORAD catalog number, present on both lines.
  const noradIdLine1 = line1.slice(2, 7).trim()
  const noradIdLine2 = line2.slice(2, 7).trim()
  if (!/^\d+$/.test(noradIdLine1)) {
    return { ok: false, error: 'NORAD ID (line 1, columns 3-7) must be numeric.' }
  }
  if (noradIdLine1 !== noradIdLine2) {
    return { ok: false, error: "NORAD IDs on line 1 and line 2 don't match." }
  }

  if (tleChecksum(line1) !== Number(line1.at(-1))) {
    return { ok: false, error: 'Line 1 fails its checksum - check for typos.' }
  }
  if (tleChecksum(line2) !== Number(line2.at(-1))) {
    return { ok: false, error: 'Line 2 fails its checksum - check for typos.' }
  }

  return {
    ok: true,
    record: { name: name ?? `Satellite ${noradIdLine1}`, noradId: noradIdLine1, line1, line2 },
  }
}

export interface TleBlockParseResult {
  records: TleRecord[]
  /** One entry per record that failed to parse, prefixed with enough context (its name, or line range) to identify it. */
  errors: string[]
}

/**
 * Parses a block of one or more pasted TLEs, back-to-back - each either the
 * 3-line (name + line 1 + line 2) or bare 2-line form, auto-detected per
 * record the same way `parseTleBlock` does for a single one. Every record is
 * validated with that same rigor (line prefixes/length, matching NORAD IDs,
 * checksums), so one malformed entry is reported and skipped rather than
 * corrupting the split for the rest of the paste.
 */
export function parseTleBlocks(text: string): TleBlockParseResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const records: TleRecord[] = []
  const errors: string[] = []

  let i = 0
  while (i < lines.length) {
    const hasName = !lines[i].startsWith('1 ')
    const chunkSize = hasName ? 3 : 2
    const chunk = lines.slice(i, i + chunkSize)

    if (chunk.length < chunkSize) {
      errors.push(`Incomplete record near line ${i + 1}: expected ${chunkSize} lines, got ${chunk.length}.`)
      break
    }

    const result = parseTleBlock(chunk.join('\n'))
    if (result.ok) {
      records.push(result.record)
    } else {
      errors.push(`${hasName ? chunk[0] : `lines ${i + 1}-${i + chunkSize}`}: ${result.error}`)
    }
    i += chunkSize
  }

  return { records, errors }
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
  // Celestrak responds 404 (not 200-with-empty-body) when a query matches
  // nothing - that's a legitimate "no results" outcome, not a request failure.
  if (response.status === 404) return ''
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
