interface ElementSliderProps {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

/** A single orbital element row: a slider and a numeric input, kept in sync via a shared value. */
export function ElementSlider({ label, unit, value, min, max, step, onChange }: ElementSliderProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="w-4 shrink-0 font-mono text-slate-300">{label}</label>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1 accent-sky-400"
      />
      <input
        type="number"
        aria-label={`${label} value`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.target.valueAsNumber
          if (!Number.isNaN(next)) onChange(next)
        }}
        className="w-20 rounded bg-slate-800 px-1 py-0.5 text-right text-slate-100"
      />
      <span className="w-4 shrink-0 text-slate-400">{unit}</span>
    </div>
  )
}
