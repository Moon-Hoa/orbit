import { useState } from 'react'
import { CENTRAL_BODIES, type CentralBodyId, type OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { AllSatellitesToggle } from './AllSatellitesToggle'
import { CelestialObjectLayerPanel } from './CelestialObjectLayerPanel'
import type { UnitSystem } from './distanceUnits'
import { ExportControls } from './ExportControls'
import { GroundStationLayerPanel } from './GroundStationLayerPanel'
import { ModeToggle, type ViewerMode } from './ModeToggle'

interface SettingsPanelProps {
  unitSystem: UnitSystem
  onUnitSystemChange: (unitSystem: UnitSystem) => void
  centralBody: CentralBodyId
  mode: ViewerMode
  onModeChange: (mode: ViewerMode) => void
  onToggleSatelliteSwarm: (visible: boolean) => Promise<void>
  visibleGroundStationCategories: ReadonlySet<string>
  onToggleGroundStationCategory: (categoryId: string, visible: boolean) => void
  visibleCelestialCategories: ReadonlySet<string>
  onToggleCelestialCategory: (categoryId: string, visible: boolean) => void
  celestialOrbitersVisible: boolean
  onToggleCelestialOrbiters: (visible: boolean) => void
  /** The current primary object's label, and enough state to sample its ephemeris - forwarded to `ExportControls`. */
  exportLabel: string
  isTrackingReal: boolean
  elements: OrbitalElements
  enableJ2: boolean
  tle: TleRecord | null
}

/**
 * Single settings entry point for display/behavior preferences that used to
 * be scattered across separate floating popovers or the main top bar -
 * units, mode (design/track-real, Earth only), the all-satellites layer and
 * ground station layers (Earth), the surface-object layers (Moon/Mars/...),
 * and ephemeris export - now live here as labeled sections. `CentralBodySelector`
 * deliberately stays a separate, top-level control (via `ViewModeSelector`'s
 * dropdown): it's "what you're looking at," not a display preference. Info
 * on whichever marker was last clicked shows in `MarkerTooltip`, anchored to
 * it on the globe, rather than in these sections - so this panel doesn't
 * need to know about the current selection at all.
 */
export function SettingsPanel({
  unitSystem,
  onUnitSystemChange,
  centralBody,
  mode,
  onModeChange,
  onToggleSatelliteSwarm,
  visibleGroundStationCategories,
  onToggleGroundStationCategory,
  visibleCelestialCategories,
  onToggleCelestialCategory,
  celestialOrbitersVisible,
  onToggleCelestialOrbiters,
  exportLabel,
  isTrackingReal,
  elements,
  enableJ2,
  tle,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentBody = CENTRAL_BODIES[centralBody]
  const isEarth = currentBody.hasEarthOnlyFeatures

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
        <div className="absolute top-full right-0 z-10 mt-1 flex max-h-[70vh] w-72 flex-col gap-3 overflow-y-auto rounded-lg bg-slate-900/95 p-3 text-xs backdrop-blur">
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

          {isEarth && (
            <div className="border-t border-slate-700 pt-3">
              <span id="mode-label" className="mb-1 block text-slate-400">
                Mode
              </span>
              <div role="group" aria-labelledby="mode-label">
                <ModeToggle mode={mode} onChange={onModeChange} />
              </div>
            </div>
          )}

          {isEarth ? (
            <>
              <div className="border-t border-slate-700 pt-3">
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

          <div className="border-t border-slate-700 pt-3">
            <span className="mb-1 block text-slate-400">Export</span>
            <ExportControls
              label={exportLabel}
              isTrackingReal={isTrackingReal}
              elements={elements}
              enableJ2={enableJ2}
              tle={tle}
              hasEarthOnlyFeatures={isEarth}
              muKm3S2={currentBody.muKm3S2}
            />
          </div>
        </div>
      )}
    </div>
  )
}
