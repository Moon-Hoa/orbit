import { GROUND_STATION_CATEGORIES } from '../groundStations'
import { colorToCss } from './companions'

interface GroundStationLayerPanelProps {
  visibleCategoryIds: ReadonlySet<string>
  onToggleCategory: (categoryId: string, visible: boolean) => void
}

/**
 * A checkbox per ground station category. A settings section (see
 * `SettingsPanel`), not its own popover - it renders unconditionally and
 * expects its parent to control visibility. Info on whichever pin was last
 * clicked now shows in `MarkerTooltip`, anchored to the pin itself, rather
 * than here.
 */
export function GroundStationLayerPanel({
  visibleCategoryIds,
  onToggleCategory,
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
    </div>
  )
}
