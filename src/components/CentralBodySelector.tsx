import { CENTRAL_BODIES, CENTRAL_BODY_IDS, type CentralBodyId } from '../engine'

interface CentralBodySelectorProps {
  centralBody: CentralBodyId
  onChange: (centralBody: CentralBodyId) => void
}

/**
 * The body-view dropdown menu (Mercury, Venus, Earth, Moon, Mars, Jupiter,
 * Saturn, Uranus, Neptune, in real order from the Sun) - opened from the
 * "Body view" button in `ViewModeSelector`, which owns the open/closed
 * state. A vertical list rather than a horizontal button row, so it scales
 * to any number of bodies via ordinary vertical scroll instead of needing
 * its own horizontal-scroll workaround.
 */
export function CentralBodySelector({ centralBody, onChange }: CentralBodySelectorProps) {
  return (
    <div className="flex max-h-[70vh] w-48 flex-col overflow-y-auto rounded-lg bg-slate-900/95 py-1 text-sm shadow-lg backdrop-blur">
      {CENTRAL_BODY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={centralBody === id}
          className={`px-3 py-1.5 text-left ${
            centralBody === id ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {CENTRAL_BODIES[id].label}
        </button>
      ))}
    </div>
  )
}
