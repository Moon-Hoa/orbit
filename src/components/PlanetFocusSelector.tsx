import { PLANET_IDS, PLANET_LABELS, type PlanetId } from '../engine'

interface PlanetFocusSelectorProps {
  /** The planet the solar-system-view camera is currently focused on, or `null` in the whole-system overview. */
  focusedPlanet: PlanetId | null
  onFocusPlanet: (planet: PlanetId) => void
}

/**
 * The solar-system-view dropdown menu for picking a planet to center the
 * camera on directly - opened from the "Solar system view" button in
 * `ViewModeSelector`, which owns the open/closed state. Calls the same
 * `SolarSystemScene.focusOnPlanet` that clicking a planet's "Center view"
 * tooltip button already uses (see the click-to-inspect/click-to-center
 * issues), just reached a second way. Moons and "other bodies" are out of
 * scope for focusing, same as those issues - planets only.
 */
export function PlanetFocusSelector({ focusedPlanet, onFocusPlanet }: PlanetFocusSelectorProps) {
  return (
    <div className="flex max-h-[70vh] w-48 flex-col overflow-y-auto rounded-lg bg-slate-900/95 py-1 text-sm shadow-lg backdrop-blur">
      {PLANET_IDS.map((planet) => (
        <button
          key={planet}
          type="button"
          onClick={() => onFocusPlanet(planet)}
          aria-pressed={focusedPlanet === planet}
          className={`px-3 py-1.5 text-left ${
            focusedPlanet === planet ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {PLANET_LABELS[planet]}
        </button>
      ))}
    </div>
  )
}
