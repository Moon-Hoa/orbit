import { CENTRAL_BODIES, CENTRAL_BODY_IDS, type CentralBodyId } from '../engine'

interface CentralBodySelectorProps {
  centralBody: CentralBodyId
  onChange: (centralBody: CentralBodyId) => void
}

/**
 * Toggle between the bodies the 3D scene can be centered on (Earth, Moon,
 * Mars, Mercury, Venus, Jupiter, Uranus, Neptune). Scrolls horizontally
 * rather than clipping - with 8 bodies (up from the original 3), a plain
 * `overflow-hidden` row would silently cut buttons off past the container's
 * width, especially on narrow viewports, making some bodies unreachable.
 * `max-w-[calc(100vw-2rem)]` (not `max-w-full`) since this sits in a
 * `flex-wrap` layout whose own width is shrink-to-fit rather than a fixed
 * box - a percentage-based max-width has nothing definite to resolve
 * against there, so this row would otherwise just grow past the viewport
 * instead of scrolling (same viewport-relative pattern `OrbitViewer`'s other
 * floating panels already use).
 */
export function CentralBodySelector({ centralBody, onChange }: CentralBodySelectorProps) {
  return (
    <div className="flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-lg bg-slate-900/80 backdrop-blur">
      {CENTRAL_BODY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={centralBody === id}
          className={`shrink-0 px-3 py-1.5 text-sm ${
            centralBody === id ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {CENTRAL_BODIES[id].label}
        </button>
      ))}
    </div>
  )
}
