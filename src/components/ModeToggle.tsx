export type ViewerMode = 'design' | 'track-real'

interface ModeToggleProps {
  mode: ViewerMode
  onChange: (mode: ViewerMode) => void
}

/** Toggle between designing a synthetic orbit and tracking a real satellite. */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
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
        aria-pressed={mode === 'track-real'}
        className={`px-3 py-1.5 text-sm ${
          mode === 'track-real' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Track real satellite
      </button>
    </div>
  )
}
