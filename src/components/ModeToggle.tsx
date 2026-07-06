export type ViewerMode = 'design' | 'track-real'

interface ModeToggleProps {
  mode: ViewerMode
  onChange: (mode: ViewerMode) => void
  /** Disables the "Track real satellite" option - used when a non-Earth body is selected, since Celestrak has no Moon/Mars catalog. */
  disableTrackReal?: boolean
}

/** Toggle between designing a synthetic orbit and tracking a real satellite. */
export function ModeToggle({ mode, onChange, disableTrackReal = false }: ModeToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-slate-900/80 backdrop-blur">
      <button
        type="button"
        onClick={() => onChange('design')}
        aria-pressed={mode === 'design'}
        className={`px-3 py-1.5 text-sm ${
          mode === 'design' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Design orbit
      </button>
      <button
        type="button"
        onClick={() => onChange('track-real')}
        disabled={disableTrackReal}
        aria-pressed={mode === 'track-real'}
        title={disableTrackReal ? 'Only available for Earth' : undefined}
        className={`px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
          mode === 'track-real' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Track real satellite
      </button>
    </div>
  )
}
