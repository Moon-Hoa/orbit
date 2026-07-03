import { useState } from 'react'
import type { UnitSystem } from './distanceUnits'

interface SettingsPanelProps {
  unitSystem: UnitSystem
  onUnitSystemChange: (unitSystem: UnitSystem) => void
}

/** A small settings menu; currently holds just the metric/imperial toggle, but is the natural home for future display preferences. */
export function SettingsPanel({ unitSystem, onUnitSystemChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Settings"
        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
      >
        ⚙
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 w-44 rounded-lg bg-slate-900/95 p-3 text-xs backdrop-blur">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">Settings</h2>
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
      )}
    </div>
  )
}
