import { type FormEvent, useState } from 'react'
import { type TleRecord, parseTleBlock, parseTleBlocks, searchByName } from '../satellite'
import type { BulkAddSummary } from './companions'

interface SatelliteSearchProps {
  selectedTle: TleRecord | null
  onSelect: (tle: TleRecord) => void
  /** Adds the satellite as an additional (non-primary) tracked object, if provided. */
  onAddCompanion?: (tle: TleRecord) => void
  /** Adds several satellites as companions at once, if provided (alongside single-add via onAddCompanion). */
  onAddCompanionMany?: (tles: TleRecord[]) => BulkAddSummary
}

type InputMode = 'search' | 'paste'

/** Search Celestrak by name or NORAD ID, or paste a raw TLE, to pick a real satellite to track. */
export function SatelliteSearch({
  selectedTle,
  onSelect,
  onAddCompanion,
  onAddCompanionMany,
}: SatelliteSearchProps) {
  const [mode, setMode] = useState<InputMode>('search')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TleRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [checkedNoradIds, setCheckedNoradIds] = useState<Set<string>>(new Set())
  const [bulkSummary, setBulkSummary] = useState<BulkAddSummary | null>(null)

  const [pastedTle, setPastedTle] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteBulkResult, setPasteBulkResult] = useState<{
    summary: BulkAddSummary
    parseErrors: string[]
  } | null>(null)

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setSearchError(null)
    try {
      const found = await searchByName(query)
      setResults(found)
      setCheckedNoradIds(new Set())
      setBulkSummary(null)
      if (found.length === 0) setSearchError('No satellites found.')
    } catch {
      setSearchError('Search failed - try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleChecked(noradId: string) {
    setBulkSummary(null)
    setCheckedNoradIds((prev) => {
      const next = new Set(prev)
      if (next.has(noradId)) next.delete(noradId)
      else next.add(noradId)
      return next
    })
  }

  function handleAddSelected() {
    if (!onAddCompanionMany || checkedNoradIds.size === 0) return
    const selected = results.filter((tle) => checkedNoradIds.has(tle.noradId))
    setBulkSummary(onAddCompanionMany(selected))
    setCheckedNoradIds(new Set())
  }

  function handlePaste(event: FormEvent) {
    event.preventDefault()
    const result = parseTleBlock(pastedTle)
    if (result.ok) {
      setPasteError(null)
      setPasteBulkResult(null)
      onSelect(result.record)
    } else {
      setPasteError(result.error)
    }
  }

  function handleAddPastedAsCompanions() {
    if (!onAddCompanionMany) return
    setPasteError(null)
    const { records, errors } = parseTleBlocks(pastedTle)
    const summary = records.length > 0 ? onAddCompanionMany(records) : { addedCount: 0, skippedCount: 0 }
    setPasteBulkResult({ summary, parseErrors: errors })
  }

  return (
    <div className="absolute top-4 left-4 flex w-72 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Track a real satellite</h2>

      {selectedTle && (
        <p className="text-xs text-slate-300">
          Tracking: <span className="font-mono text-sky-400">{selectedTle.name}</span>
        </p>
      )}

      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('search')}
          aria-pressed={mode === 'search'}
          aria-label="Search mode"
          className={`flex-1 rounded px-2 py-1 ${
            mode === 'search' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          aria-pressed={mode === 'paste'}
          aria-label="Paste TLE mode"
          className={`flex-1 rounded px-2 py-1 ${
            mode === 'paste' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          Paste TLE
        </button>
      </div>

      {mode === 'search' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or NORAD ID"
              aria-label="Satellite search"
              className="w-0 flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
            >
              {isLoading ? '...' : 'Search'}
            </button>
          </form>

          {searchError && <p className="text-xs text-red-400">{searchError}</p>}

          {results.length > 0 && (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs">
              {results.map((tle) => (
                <li key={tle.noradId} className="flex items-center gap-1 overflow-hidden rounded">
                  {onAddCompanionMany && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${tle.name} for bulk add`}
                      checked={checkedNoradIds.has(tle.noradId)}
                      onChange={() => toggleChecked(tle.noradId)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(tle)}
                    className={`flex-1 px-2 py-1 text-left ${
                      selectedTle?.noradId === tle.noradId
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {tle.name} <span className="text-slate-400">#{tle.noradId}</span>
                  </button>
                  {onAddCompanion && (
                    <button
                      type="button"
                      onClick={() => onAddCompanion(tle)}
                      aria-label={`Add ${tle.name} as companion`}
                      title="Add as companion"
                      className="shrink-0 bg-slate-700 px-1.5 py-1 text-slate-300 hover:bg-slate-600"
                    >
                      +
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {onAddCompanionMany && results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={checkedNoradIds.size === 0}
                className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add {checkedNoradIds.size || ''} selected as companions
              </button>
            </div>
          )}
          {bulkSummary && (
            <p className="text-xs text-slate-400">
              Added {bulkSummary.addedCount}
              {bulkSummary.skippedCount > 0
                ? `, skipped ${bulkSummary.skippedCount} (already tracked or companion limit reached)`
                : ''}
              .
            </p>
          )}
        </>
      )}

      {mode === 'paste' && (
        <form onSubmit={handlePaste} className="flex flex-col gap-2 text-xs">
          <textarea
            aria-label="Paste TLE"
            placeholder={
              'ISS (ZARYA)\n1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996\n2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972\n\nPaste multiple (name+2 lines each, back-to-back) to add them all as companions.'
            }
            value={pastedTle}
            onChange={(event) => setPastedTle(event.target.value)}
            rows={3}
            className="resize-none rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-sky-500 px-2 py-1 font-medium text-white hover:bg-sky-400"
            >
              Track
            </button>
            {onAddCompanionMany && (
              <button
                type="button"
                onClick={handleAddPastedAsCompanions}
                className="rounded bg-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-600"
              >
                Add all as companions
              </button>
            )}
          </div>
          {pasteError && <p className="text-red-400">{pasteError}</p>}
          {pasteBulkResult && (
            <div className="text-slate-400">
              <p>
                Added {pasteBulkResult.summary.addedCount}
                {pasteBulkResult.summary.skippedCount > 0
                  ? `, skipped ${pasteBulkResult.summary.skippedCount} (already tracked or companion limit reached)`
                  : ''}
                .
              </p>
              {pasteBulkResult.parseErrors.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5 text-red-400">
                  {pasteBulkResult.parseErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
