import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'
import type { Preset } from '../scenario'
import { degToRad, radToDeg } from './angleUnits'
import type { BulkAddSummary } from './companions'
import { ElementSlider } from './ElementSlider'
import { PresetSelector } from './PresetSelector'

interface ElementPanelProps {
  elements: OrbitalElements
  onChange: (elements: OrbitalElements) => void
  onSelectPreset: (elements: OrbitalElements, label: string) => void
  onAddCompanion?: (preset: Preset) => void
  onAddCompanionMany?: (presets: Preset[]) => BulkAddSummary
  enableJ2: boolean
  onEnableJ2Change: (enableJ2: boolean) => void
  /** The selected central body's radius, km. Defaults to Earth's. */
  bodyRadiusKm?: number
  /** The selected central body's display name, used in the perigee warning. Defaults to "Earth". */
  bodyLabel?: string
  /** Presets to offer (e.g. ISS, GEO); pass `[]` for a non-Earth body. Defaults to the full built-in list. */
  presets?: Preset[]
}

/** Sliders + numeric inputs for the six classical orbital elements, live-synced to engine state. */
export function ElementPanel({
  elements,
  onChange,
  onSelectPreset,
  onAddCompanion,
  onAddCompanionMany,
  enableJ2,
  onEnableJ2Change,
  bodyRadiusKm = EARTH_RADIUS_KM,
  bodyLabel = 'Earth',
  presets,
}: ElementPanelProps) {
  const perigeeAltitudeKm = elements.semiMajorAxisKm * (1 - elements.eccentricity) - bodyRadiusKm

  return (
    <div className="absolute top-4 left-4 flex w-72 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Orbital elements</h2>
      <PresetSelector
        onSelect={onSelectPreset}
        onAddCompanion={onAddCompanion}
        onAddCompanionMany={onAddCompanionMany}
        presets={presets}
      />

      <ElementSlider
        label="a"
        unit="km"
        min={bodyRadiusKm + 200}
        max={50000}
        step={1}
        value={elements.semiMajorAxisKm}
        onChange={(semiMajorAxisKm) => onChange({ ...elements, semiMajorAxisKm })}
      />
      <ElementSlider
        label="e"
        unit=""
        min={0}
        max={0.9}
        step={0.001}
        value={elements.eccentricity}
        onChange={(eccentricity) => onChange({ ...elements, eccentricity })}
      />
      <ElementSlider
        label="i"
        unit="°"
        min={0}
        max={180}
        step={0.1}
        value={radToDeg(elements.inclinationRad)}
        onChange={(deg) => onChange({ ...elements, inclinationRad: degToRad(deg) })}
      />
      <ElementSlider
        label="Ω"
        unit="°"
        min={0}
        max={360}
        step={0.1}
        value={radToDeg(elements.raanRad)}
        onChange={(deg) => onChange({ ...elements, raanRad: degToRad(deg) })}
      />
      <ElementSlider
        label="ω"
        unit="°"
        min={0}
        max={360}
        step={0.1}
        value={radToDeg(elements.argOfPerigeeRad)}
        onChange={(deg) => onChange({ ...elements, argOfPerigeeRad: degToRad(deg) })}
      />
      <ElementSlider
        label="ν"
        unit="°"
        min={0}
        max={360}
        step={0.1}
        value={radToDeg(elements.trueAnomalyRad)}
        onChange={(deg) => onChange({ ...elements, trueAnomalyRad: degToRad(deg) })}
      />

      {perigeeAltitudeKm < 0 && (
        <p className="mt-1 text-xs text-red-400">
          Warning: perigee altitude is {perigeeAltitudeKm.toFixed(0)} km — orbit intersects {bodyLabel}.
        </p>
      )}

      <label className="mt-1 flex items-center gap-2 border-t border-slate-700 pt-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={enableJ2}
          onChange={(event) => onEnableJ2Change(event.target.checked)}
        />
        Enable J2 perturbation (RAAN/argp drift)
      </label>
    </div>
  )
}
