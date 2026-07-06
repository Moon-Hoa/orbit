import { useState } from 'react'
import { CENTRAL_BODIES, type CentralBodyId } from '../engine'
import { AllSatellitesToggle } from './AllSatellitesToggle'
import { CelestialObjectLayerPanel } from './CelestialObjectLayerPanel'
import type { UnitSystem } from './distanceUnits'
import { GroundStationLayerPanel } from './GroundStationLayerPanel'

interface SettingsPanelProps {
  unitSystem: UnitSystem
  onUnitSystemChange: (unitSystem: UnitSystem) => void
  centralBody: CentralBodyId
  onToggleSatelliteSwarm: (visible: boolean) => Promise<void>
  visibleGroundStationCategories: ReadonlySet<string>
  onToggleGroundStationCategory: (categoryId: string, visible: boolean) => void
  visibleCelestialCategories: ReadonlySet<string>
  onToggleCelestialCategory: (categoryId: string, visible: boolean) => void
  celestialOrbitersVisible: boolean
  onToggleCelestialOrbiters: (visible: boolean) => void
}

/**
 * Single settings entry point for display/behavior preferences that used to
 * be scattered across separate floating popovers - units, the all-satellites
 * layer and ground station layers (Earth), or the surface-object layers
 * (Moon/Mars) - now live here as labeled sections. `ModeToggle` and
 * `CentralBodySelector` deliberately stay separate, top-level controls:
 * they're "what you're doing/looking at" (like the existing mode toggle),
 * not a persistent display preference. Info on whichever marker was last
 * clicked shows in `MarkerTooltip`, anchored to it on the globe, rather than
 * in these layer sections - so this panel doesn't need to know about the
 * current selection at all.
 */
export function SettingsPanel({
  unitSystem,
  onUnitSystemChange,
  centralBody,
  onToggleSatelliteSwarm,
  visibleGroundStationCategories,
  onToggleGroundStationCategory,
  visibleCelestialCategories,
  onToggleCelestialCategory,
  celestialOrbitersVisible,
  onToggleCelestialOrbiters,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isEarth = CENTRAL_BODIES[centralBody].hasEarthOnlyFeatures

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Settings"
        className="flex min-h-11 min-w-11 items-center justify-center rounded bg-slate-800 text-sm text-slate-200 hover:bg-slate-700"
      >
        ⚙
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 flex w-72 flex-col gap-3 rounded-lg bg-slate-900/95 p-3 text-xs backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-100">Settings</h2>

          <div>
            <span id="unit-system-label" className="mb-1 block text-slate-400">
              Units
            </span>
            <div
              role="group"
              aria-labelledby="unit-system-label"
              className="flex overflow-hidden rounded"
            >
              <button
                type="button"
                onClick={() => onUnitSystemChange('metric')}
                aria-pressed={unitSystem === 'metric'}
                className={`flex-1 px-2 py-1 ${
                  unitSystem === 'metric' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => onUnitSystemChange('imperial')}
                aria-pressed={unitSystem === 'imperial'}
                className={`flex-1 px-2 py-1 ${
                  unitSystem === 'imperial' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Imperial
              </button>
            </div>
          </div>

          {isEarth ? (
            <>
              <div>
                <span className="mb-1 block text-slate-400">Satellites</span>
                <AllSatellitesToggle onToggle={onToggleSatelliteSwarm} />
              </div>
              <div className="border-t border-slate-700 pt-3">
                <GroundStationLayerPanel
                  visibleCategoryIds={visibleGroundStationCategories}
                  onToggleCategory={onToggleGroundStationCategory}
                />
              </div>
            </>
          ) : (
            <div className="border-t border-slate-700 pt-3">
              <CelestialObjectLayerPanel
                centralBody={centralBody}
                visibleCategoryIds={visibleCelestialCategories}
                onToggleCategory={onToggleCelestialCategory}
                orbitersVisible={celestialOrbitersVisible}
                onToggleOrbiters={onToggleCelestialOrbiters}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
