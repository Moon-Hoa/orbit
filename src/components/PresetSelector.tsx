import { useState } from 'react'
import type { OrbitalElements } from '../engine'
import { type Preset, PRESETS } from '../scenario'
import type { BulkAddSummary } from './companions'

interface PresetSelectorProps {
  onSelect: (elements: OrbitalElements, label: string) => void
  /** Adds the preset as an additional (non-primary) tracked object, if provided. */
  onAddCompanion?: (preset: Preset) => void
  /** Adds several presets as companions at once, if provided (alongside single-add via onAddCompanion). */
  onAddCompanionMany?: (presets: Preset[]) => BulkAddSummary
}

/** A row of buttons for loading a well-known orbit (ISS, GEO, Molniya, ...) instantly. */
export function PresetSelector({ onSelect, onAddCompanion, onAddCompanionMany }: PresetSelectorProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<BulkAddSummary | null>(null)

  function toggleChecked(id: string) {
    setSummary(null)
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddSelected() {
    if (!onAddCompanionMany || checkedIds.size === 0) return
    const selected = PRESETS.filter((preset) => checkedIds.has(preset.id))
    setSummary(onAddCompanionMany(selected))
    setCheckedIds(new Set())
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <div key={preset.id} className="flex items-center gap-1 overflow-hidden rounded">
            {onAddCompanionMany && (
              <input
                type="checkbox"
                aria-label={`Select ${preset.label} for bulk add`}
                checked={checkedIds.has(preset.id)}
                onChange={() => toggleChecked(preset.id)}
                className="ml-1"
              />
            )}
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
                className="shrink-0 bg-slate-700 px-1.5 py-1 text-xs text-slate-300 hover:bg-slate-600"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
      {onAddCompanionMany && (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={checkedIds.size === 0}
            className="rounded bg-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add {checkedIds.size || ''} selected as companions
          </button>
          {summary && (
            <p className="text-slate-400">
              Added {summary.addedCount}
              {summary.skippedCount > 0
                ? `, skipped ${summary.skippedCount} (already tracked or companion limit reached)`
                : ''}
              .
            </p>
          )}
        </div>
      )}
    </div>
  )
}
