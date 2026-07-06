import { useState } from 'react'
import { CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES } from '../celestialObjects'
import type { CentralBodyId } from '../engine'
import { ORBITER_MARKER_COLOR, type CelestialObjectSelection } from '../three/OrbitScene'
import { colorToCss } from './companions'

interface CelestialObjectLayerPanelProps {
  centralBody: CentralBodyId
  visibleCategoryIds: ReadonlySet<string>
  onToggleCategory: (categoryId: string, visible: boolean) => void
  orbitersVisible: boolean
  onToggleOrbiters: (visible: boolean) => void
  selection: CelestialObjectSelection | null
}

/**
 * Popover with a checkbox per surface-object category (landers/rovers,
 * failed landings, ...) plus one more for active orbiters, and basic info on
 * whichever pin/marker the user last clicked. Only meaningful for Moon/Mars -
 * `CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES` has no entries for Earth.
 */
export function CelestialObjectLayerPanel({
  centralBody,
  visibleCategoryIds,
  onToggleCategory,
  orbitersVisible,
  onToggleOrbiters,
  selection,
}: CelestialObjectLayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const categories = CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES[centralBody]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
      >
        Surface objects
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 w-72 rounded-lg bg-slate-900/95 p-3 text-xs backdrop-blur">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">Surface objects</h2>
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

          {selection && (
            <div className="mt-3 border-t border-slate-700 pt-2">
              <p className="font-medium text-slate-100">{selection.object.name}</p>
              <p className="text-slate-400">
                {selection.object.mission} · {selection.object.agency}
              </p>
              <p className="text-slate-400">
                {selection.object.date} · {selection.object.status === 'active' ? 'Active' : 'Inactive'}
                {selection.kind === 'surface' &&
                  ` · ${selection.object.latitudeDeg.toFixed(2)}°, ${selection.object.longitudeDeg.toFixed(2)}°`}
              </p>
              <p className="mt-1 text-slate-300">{selection.object.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
