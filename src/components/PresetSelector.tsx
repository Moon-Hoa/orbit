import type { OrbitalElements } from '../engine'
import { PRESETS } from '../scenario'

interface PresetSelectorProps {
  onSelect: (elements: OrbitalElements) => void
}

/** A row of buttons for loading a well-known orbit (ISS, GEO, Molniya, ...) instantly. */
export function PresetSelector({ onSelect }: PresetSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.elements)}
          className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
