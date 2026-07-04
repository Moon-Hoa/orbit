import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchActiveSatellites } from './activeSatellitesProvider'

const ISS_NAME = 'ISS (ZARYA)'
const ISS_LINE1 = '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996'
const ISS_LINE2 = '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972'
const NAUKA_NAME = 'ISS (NAUKA)'
const NAUKA_LINE1 = '1 49044U 21066A   26182.50817465  .00006185  00000+0  11827-3 0  9992'
const NAUKA_LINE2 = '2 49044  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254608691'

const ACTIVE_GROUP_TEXT = [ISS_NAME, ISS_LINE1, ISS_LINE2, NAUKA_NAME, NAUKA_LINE1, NAUKA_LINE2].join(
  '\n',
)

/** Celestrak's actual response body when a GROUP is re-downloaded within its ~2h publish window - confirmed by hitting this endpoint directly. */
const THROTTLE_BODY =
  'GP data has not updated since your last successful download of GROUP=active at 2026-07-04 05:54:51 UTC.\nData is updated once every 2 hours.'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchActiveSatellites', () => {
  it('fetches the active group and returns every parsed record', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(ACTIVE_GROUP_TEXT, { status: 200 }))

    const records = await fetchActiveSatellites()

    expect(records).toHaveLength(2)
    expect(records[0].noradId).toBe('25544')
    expect(records[1].noradId).toBe('49044')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('GROUP=active'))
  })

  it('serves from cache on a second call without refetching', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(ACTIVE_GROUP_TEXT, { status: 200 }))

    await fetchActiveSatellites()
    await fetchActiveSatellites()

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('refetches once the cache entry has expired', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(ACTIVE_GROUP_TEXT, { status: 200 }))

    vi.useFakeTimers()
    await fetchActiveSatellites()
    vi.advanceTimersByTime(3 * 60 * 60 * 1000) // 3 hours, past the 2hr TTL
    await fetchActiveSatellites()

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to stale cache when a refetch hits Celestrak\'s GROUP rate limit (403)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(ACTIVE_GROUP_TEXT, { status: 200 }))

    vi.useFakeTimers()
    const firstFetch = await fetchActiveSatellites()
    vi.advanceTimersByTime(3 * 60 * 60 * 1000) // past the 2hr TTL, so a refetch is attempted

    vi.mocked(fetch).mockResolvedValueOnce(new Response(THROTTLE_BODY, { status: 403 }))
    const secondFetch = await fetchActiveSatellites()

    expect(secondFetch).toEqual(firstFetch)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to stale cache on a network error, not just a throttle response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(ACTIVE_GROUP_TEXT, { status: 200 }))

    vi.useFakeTimers()
    const firstFetch = await fetchActiveSatellites()
    vi.advanceTimersByTime(3 * 60 * 60 * 1000)

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const secondFetch = await fetchActiveSatellites()

    expect(secondFetch).toEqual(firstFetch)
  })

  it('throws if the fetch fails and nothing is cached yet', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(THROTTLE_BODY, { status: 403 }))
    await expect(fetchActiveSatellites()).rejects.toThrow()
  })
})
