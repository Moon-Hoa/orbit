interface OtherBodiesToggleProps {
  isOn: boolean
  onToggle: (visible: boolean) => void
}

/** Toggles the "other bodies" layer (Pluto, Ceres, Eris, Halley's Comet) - a single button, since (unlike ground stations) there's only one category and positions are already computed synchronously, unlike `AllSatellitesToggle`'s async data load. */
export function OtherBodiesToggle({ isOn, onToggle }: OtherBodiesToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isOn)}
      aria-pressed={isOn}
      className={`rounded px-3 py-1.5 text-sm ${
        isOn ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
    >
      Other bodies
    </button>
  )
}
