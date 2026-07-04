import { useState } from 'react'

interface AllSatellitesToggleProps {
  /** Shows/hides the swarm; the promise resolves once loaded (first enable only) or rejects if that load failed. */
  onToggle: (visible: boolean) => Promise<void>
}

/** Toggles the "all satellites currently in orbit" background layer - a single button, since (unlike ground stations) there's only one source/category. */
export function AllSatellitesToggle({ onToggle }: AllSatellitesToggleProps) {
  const [isOn, setIsOn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    const next = !isOn
    if (!next) {
      setIsOn(false)
      await onToggle(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await onToggle(true)
      setIsOn(true)
    } catch {
      setError('Could not load satellite data - try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-pressed={isOn}
        className={`rounded px-3 py-1.5 text-sm ${
          isOn ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        } disabled:cursor-wait disabled:opacity-60`}
      >
        {isLoading ? 'Loading…' : 'All satellites'}
      </button>
      {error && (
        <p className="absolute top-full right-0 z-10 mt-1 w-48 rounded bg-slate-900/95 p-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
