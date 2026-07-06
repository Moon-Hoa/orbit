import type { ChangeEvent, RefObject } from 'react'

/** Playback speeds, in simulated days advanced per real second. */
const SPEED_PRESETS = [
  { label: '1 day/s', daysPerSecond: 1 },
  { label: '1 week/s', daysPerSecond: 7 },
  { label: '1 month/s', daysPerSecond: 30 },
  { label: '1 year/s', daysPerSecond: 365 },
]

interface SolarSystemTimeControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  speedDaysPerSecond: number
  onSpeedChange: (speedDaysPerSecond: number) => void
  onSyncToNow: () => void
  onJumpToDate: (date: Date) => void
  dateReadoutRef: RefObject<HTMLSpanElement | null>
}

/**
 * Play/pause, a speed multiplier (in simulated days per real second - months
 * or years at a time, unlike the body view's minutes-scale `PlaybackControls`),
 * a "sync to now" shortcut, and a manual date picker for jumping straight to
 * a date of interest (e.g. a known mission transit window).
 */
export function SolarSystemTimeControls({
  isPlaying,
  onTogglePlay,
  speedDaysPerSecond,
  onSpeedChange,
  onSyncToNow,
  onJumpToDate,
  dateReadoutRef,
}: SolarSystemTimeControlsProps) {
  function handleDateInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.value) return
    // Interpret the picked calendar date as local midnight (matching how the
    // date readout displays dates), not UTC midnight - otherwise picking a
    // date could show the day before it in the readout for any timezone
    // behind UTC.
    const [year, month, day] = event.target.value.split('-').map(Number)
    onJumpToDate(new Date(year, month - 1, day))
  }

  return (
    <div className="absolute bottom-4 left-1/2 flex w-[32rem] max-w-[90vw] -translate-x-1/2 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded bg-sky-500 px-3 py-1 text-sm font-medium text-white hover:bg-sky-400"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onSyncToNow}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-600"
        >
          Sync to now
        </button>
        <select
          aria-label="Speed"
          value={speedDaysPerSecond}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100"
        >
          {SPEED_PRESETS.map((preset) => (
            <option key={preset.daysPerSecond} value={preset.daysPerSecond}>
              {preset.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Jump to date"
          onChange={handleDateInputChange}
          className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100"
        />
        <span
          ref={dateReadoutRef}
          data-testid="date-readout"
          className="ml-auto font-mono text-xs text-slate-300"
        >
          &nbsp;
        </span>
      </div>
    </div>
  )
}
