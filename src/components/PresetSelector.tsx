import type { OrbitalElements } from '../engine'
import { type Preset, PRESETS } from '../scenario'

interface PresetSelectorProps {
  onSelect: (elements: OrbitalElements, label: string) => void
  /** Adds the preset as an additional (non-primary) tracked object, if provided. */
  onAddCompanion?: (preset: Preset) => void
}

/** A row of buttons for loading a well-known orbit (ISS, GEO, Molniya, ...) instantly. */
export function PresetSelector({ onSelect, onAddCompanion }: PresetSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRESETS.map((preset) => (
        <div key={preset.id} className="flex overflow-hidden rounded">
          <button
            type="button"
            onClick={() => onSelect(preset.elements, preset.label)}
            className="bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            {preset.label}
          </button>
          {onAddCompanion && (
            <button
              type="button"
              onClick={() => onAddCompanion(preset)}
              aria-label={`Add ${preset.label} as companion`}
              title="Add as companion"
              className="bg-slate-700 px-1.5 py-1 text-xs text-slate-300 hover:bg-slate-600"
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
