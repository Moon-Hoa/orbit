import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchByNoradId, parseTleText, searchByName } from './celestrakProvider'

const ISS_NAME = 'ISS (ZARYA)'
const ISS_LINE1 = '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996'
const ISS_LINE2 = '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972'

const MULTI_RECORD_TEXT = [
  ISS_NAME,
  ISS_LINE1,
  ISS_LINE2,
  'ISS (NAUKA)             ',
  '1 49044U 21066A   26182.50817465  .00006185  00000+0  11827-3 0  9992',
  '2 49044  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254608691',
].join('\n')

describe('parseTleText', () => {
  it('parses a single record', () => {
    const records = parseTleText(`${ISS_NAME}\n${ISS_LINE1}\n${ISS_LINE2}\n`)
    expect(records).toEqual([
      { name: 'ISS (ZARYA)', noradId: '25544', line1: ISS_LINE1, line2: ISS_LINE2 },
    ])
  })

  it('parses multiple records and extracts the NORAD ID from line 1', () => {
    const records = parseTleText(MULTI_RECORD_TEXT)
    expect(records).toHaveLength(2)
    expect(records[0].noradId).toBe('25544')
    expect(records[1].noradId).toBe('49044')
    expect(records[1].name).toBe('ISS (NAUKA)')
  })

  it('returns an empty array for blank input', () => {
    expect(parseTleText('')).toEqual([])
    expect(parseTleText('   \n\n')).toEqual([])
  })
})

describe('celestrakProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchByNoradId requests CATNR and returns the parsed record', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(`${ISS_NAME}\n${ISS_LINE1}\n${ISS_LINE2}\n`, { status: 200 }),
    )

    const record = await fetchByNoradId('25544')

    expect(record.noradId).toBe('25544')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('CATNR=25544'))
  })

  it('fetchByNoradId serves from cache on a second call without refetching', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(`${ISS_NAME}\n${ISS_LINE1}\n${ISS_LINE2}\n`, { status: 200 }),
    )

    await fetchByNoradId('25544')
    await fetchByNoradId('25544')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('fetchByNoradId refetches once the cache entry has expired', async () => {
    vi.mocked(fetch).mockImplementation(
      async () => new Response(`${ISS_NAME}\n${ISS_LINE1}\n${ISS_LINE2}\n`, { status: 200 }),
    )

    vi.useFakeTimers()
    try {
      await fetchByNoradId('25544')
      vi.advanceTimersByTime(3 * 60 * 60 * 1000) // 3 hours, past the 2hr TTL
      await fetchByNoradId('25544')
    } finally {
      vi.useRealTimers()
    }

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('fetchByNoradId throws if no record is found', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
    await expect(fetchByNoradId('0')).rejects.toThrow()
  })

  it('fetchByNoradId throws on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500 }))
    await expect(fetchByNoradId('25544')).rejects.toThrow()
  })

  it('searchByName requests NAME and returns all matching records', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(MULTI_RECORD_TEXT, { status: 200 }))

    const records = await searchByName('ISS')

    expect(records).toHaveLength(2)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('NAME=ISS'))
  })

  it('searchByName returns an empty array without fetching for a blank query', async () => {
    const records = await searchByName('   ')
    expect(records).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('searchByName caches per-query, independent of other queries', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(MULTI_RECORD_TEXT, { status: 200 }))

    await searchByName('ISS')
    await searchByName('iss') // same query, different case -> should hit cache
    await searchByName('Starlink') // different query -> should refetch

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
