export type ViewerMode = 'design' | 'track-real'

interface ModeToggleProps {
  mode: ViewerMode
  onChange: (mode: ViewerMode) => void
}

/**
 * Scaffold for the "design an orbit" vs. "track a real satellite" toggle.
 * Track-real mode isn't wired up until Phase 5 — selecting it just shows a note.
 */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
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
      {mode === 'track-real' && (
        <p className="rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-400 backdrop-blur">
          Coming in Phase 5 — showing the design-orbit view for now.
        </p>
      )}
    </div>
  )
}
