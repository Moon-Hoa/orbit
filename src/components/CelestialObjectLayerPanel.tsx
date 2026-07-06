import { CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES } from '../celestialObjects'
import type { CentralBodyId } from '../engine'
import { ORBITER_MARKER_COLOR } from '../three/OrbitScene'
import { colorToCss } from './companions'

interface CelestialObjectLayerPanelProps {
  centralBody: CentralBodyId
  visibleCategoryIds: ReadonlySet<string>
  onToggleCategory: (categoryId: string, visible: boolean) => void
  orbitersVisible: boolean
  onToggleOrbiters: (visible: boolean) => void
}

/**
 * A checkbox per surface-object category (landers/rovers, failed landings,
 * ...) plus one more for active orbiters. A settings section (see
 * `SettingsPanel`), not its own popover - it renders unconditionally and
 * expects its parent to control visibility. Only meaningful for Moon/Mars -
 * `CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES` has no entries for Earth. Info on
 * whichever pin/marker was last clicked now shows in `MarkerTooltip`,
 * anchored to it, rather than here.
 */
export function CelestialObjectLayerPanel({
  centralBody,
  visibleCategoryIds,
  onToggleCategory,
  orbitersVisible,
  onToggleOrbiters,
}: CelestialObjectLayerPanelProps) {
  const categories = CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES[centralBody]

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">Surface objects</h3>
      <ul className="flex flex-col gap-1.5">
        {categories.map((category) => (
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
            <p className="pl-6 text-slate-500">{category.note}</p>
          </li>
        ))}
        <li>
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={orbitersVisible}
              onChange={(event) => onToggleOrbiters(event.target.checked)}
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorToCss(ORBITER_MARKER_COLOR) }}
              aria-hidden="true"
            />
            <span className="flex-1 text-slate-200">Active orbiters</span>
          </label>
        </li>
      </ul>
    </div>
  )
}
