export type ViewMode = 'body' | 'solar-system'

interface ViewModeSelectorProps {
  viewMode: ViewMode
  onChange: (viewMode: ViewMode) => void
}

/** Toggle between the Earth/Moon/Mars body view and the solar system view - the two top-level, independently-scaled scenes this app renders. */
export function ViewModeSelector({ viewMode, onChange }: ViewModeSelectorProps) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-slate-900/80 backdrop-blur">
      <button
        type="button"
        onClick={() => onChange('body')}
        aria-pressed={viewMode === 'body'}
        className={`px-3 py-1.5 text-sm ${
          viewMode === 'body' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Body view
      </button>
      <button
        type="button"
        onClick={() => onChange('solar-system')}
        aria-pressed={viewMode === 'solar-system'}
        className={`px-3 py-1.5 text-sm ${
          viewMode === 'solar-system' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Solar system
      </button>
    </div>
  )
}
