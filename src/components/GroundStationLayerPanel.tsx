import { GROUND_STATION_CATEGORIES } from '../groundStations'
import type { GroundStationSelection } from '../three/OrbitScene'
import { colorToCss } from './companions'

interface GroundStationLayerPanelProps {
  visibleCategoryIds: ReadonlySet<string>
  onToggleCategory: (categoryId: string, visible: boolean) => void
  selection: GroundStationSelection | null
  /** Shown as a "use for pass prediction" action on the selected station; omitted (no button) outside track-real mode. */
  onUseForPassPrediction?: () => void
}

/**
 * A checkbox per ground station category, plus info on whichever pin was
 * last clicked. A settings section (see `SettingsPanel`), not its own
 * popover - it renders unconditionally and expects its parent to control
 * visibility.
 */
export function GroundStationLayerPanel({
  visibleCategoryIds,
  onToggleCategory,
  selection,
  onUseForPassPrediction,
}: GroundStationLayerPanelProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">Ground stations</h3>
      <ul className="flex flex-col gap-1.5">
        {GROUND_STATION_CATEGORIES.map((category) => (
          <li key={category.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-800">
              <input
                type="checkbox"
                checked={visibleCategoryIds.has(category.id)}
                onChange={(event) => onToggleCategory(category.id, event.target.checked)}
              />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorToCss(category.color) }}
                aria-hidden="true"
              />
              <span className="flex-1 text-slate-200">{category.label}</span>
            </label>
            <p className="pl-6 text-slate-500">{category.sourceNote}</p>
          </li>
        ))}
      </ul>

      {selection && (
        <div className="mt-3 border-t border-slate-700 pt-2">
          <p className="font-medium text-slate-100">{selection.station.name}</p>
          <p className="text-slate-400">
            {selection.categoryLabel} · {selection.station.latitudeDeg.toFixed(2)}°,{' '}
            {selection.station.longitudeDeg.toFixed(2)}°
          </p>
          {onUseForPassPrediction && (
            <button
              type="button"
              onClick={onUseForPassPrediction}
              className="mt-1.5 rounded bg-sky-500 px-2 py-1 text-white hover:bg-sky-400"
            >
              Use for pass prediction
            </button>
          )}
        </div>
      )}
    </div>
  )
}
