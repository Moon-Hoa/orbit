export type ViewerMode = 'design' | 'track-real'

interface ModeToggleProps {
  mode: ViewerMode
  onChange: (mode: ViewerMode) => void
}

/**
 * Toggle between designing a synthetic orbit and tracking a real satellite -
 * lives inside `SettingsPanel`'s Earth-only section (real-satellite tracking
 * has no Moon/Mars catalog), so unlike its previous top-bar incarnation it
 * no longer needs a "disable Track real satellite for non-Earth bodies"
 * option - it's simply not rendered at all for those bodies.
 */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex overflow-hidden rounded">
      <button
        type="button"
        onClick={() => onChange('design')}
        aria-pressed={mode === 'design'}
        className={`flex-1 px-2 py-1 ${
          mode === 'design' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
        }`}
      >
        Design orbit
      </button>
      <button
        type="button"
        onClick={() => onChange('track-real')}
        aria-pressed={mode === 'track-real'}
        className={`flex-1 px-2 py-1 ${
          mode === 'track-real' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
        }`}
      >
        Track real satellite
      </button>
    </div>
  )
}
