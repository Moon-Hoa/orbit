import { type FormEvent, useState } from 'react'
import { type TleRecord, searchByName } from '../satellite'

interface SatelliteSearchProps {
  selectedTle: TleRecord | null
  onSelect: (tle: TleRecord) => void
}

/** Search Celestrak by name or NORAD ID and pick a real satellite to track. */
export function SatelliteSearch({ selectedTle, onSelect }: SatelliteSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TleRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const found = await searchByName(query)
      setResults(found)
      if (found.length === 0) setError('No satellites found.')
    } catch {
      setError('Search failed - try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="absolute top-4 left-4 flex w-72 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Track a real satellite</h2>

      {selectedTle && (
        <p className="text-xs text-slate-300">
          Tracking: <span className="font-mono text-sky-400">{selectedTle.name}</span>
        </p>
      )}

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

      {error && <p className="text-xs text-red-400">{error}</p>}

      {results.length > 0 && (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs">
          {results.map((tle) => (
            <li key={tle.noradId}>
              <button
                type="button"
                onClick={() => onSelect(tle)}
                className={`w-full rounded px-2 py-1 text-left ${
                  selectedTle?.noradId === tle.noradId
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tle.name} <span className="text-slate-400">#{tle.noradId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
