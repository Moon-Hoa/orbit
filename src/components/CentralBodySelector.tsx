import { CENTRAL_BODIES, CENTRAL_BODY_IDS, type CentralBodyId } from '../engine'

interface CentralBodySelectorProps {
  centralBody: CentralBodyId
  onChange: (centralBody: CentralBodyId) => void
}

/** Toggle between the bodies the 3D scene can be centered on (Earth, Moon, Mars). */
export function CentralBodySelector({ centralBody, onChange }: CentralBodySelectorProps) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-slate-900/80 backdrop-blur">
      {CENTRAL_BODY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={centralBody === id}
          className={`px-3 py-1.5 text-sm ${
            centralBody === id ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {CENTRAL_BODIES[id].label}
        </button>
      ))}
    </div>
  )
}
