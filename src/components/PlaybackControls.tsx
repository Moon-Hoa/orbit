import type { ChangeEvent, RefObject } from 'react'

const SPEED_PRESETS = [1, 10, 60, 300, 1000]

interface PlaybackControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  speedMultiplier: number
  onSpeedChange: (speedMultiplier: number) => void
  periodSeconds: number
  onScrub: (event: ChangeEvent<HTMLInputElement>) => void
  onJumpToEpoch: () => void
  onSyncToNow: () => void
  onSyncToNowAndAdvance: () => void
  scrubRef: RefObject<HTMLInputElement | null>
  timeReadoutRef: RefObject<HTMLSpanElement | null>
  realTimeReadoutRef: RefObject<HTMLSpanElement | null>
}

/** Play/pause, speed multiplier, a scrub bar, a jump-to-epoch shortcut, and sync-to-now shortcuts. */
export function PlaybackControls({
  isPlaying,
  onTogglePlay,
  speedMultiplier,
  onSpeedChange,
  periodSeconds,
  onScrub,
  onJumpToEpoch,
  onSyncToNow,
  onSyncToNowAndAdvance,
  scrubRef,
  timeReadoutRef,
  realTimeReadoutRef,
}: PlaybackControlsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-10 flex w-[32rem] max-w-[90vw] -translate-x-1/2 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 backdrop-blur">
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
          onClick={onJumpToEpoch}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-600"
        >
          Jump to epoch
        </button>
        <button
          type="button"
          onClick={onSyncToNow}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-600"
        >
          Sync to now
        </button>
        <button
          type="button"
          onClick={onSyncToNowAndAdvance}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-600"
        >
          Sync to now, +24h
        </button>
        <select
          aria-label="Speed multiplier"
          value={speedMultiplier}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100"
        >
          {SPEED_PRESETS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
        <span className="ml-auto flex flex-col items-end font-mono text-xs text-slate-300">
          <span ref={timeReadoutRef} data-testid="time-readout">
            T+00:00:00
          </span>
          <span ref={realTimeReadoutRef} data-testid="real-time-readout" className="text-slate-500">
            &nbsp;
          </span>
        </span>
      </div>
      <input
        ref={scrubRef}
        aria-label="Scrub"
        type="range"
        defaultValue={0}
        min={0}
        max={periodSeconds}
        step={periodSeconds / 1000}
        onChange={onScrub}
        className="w-full accent-sky-400"
      />
    </div>
  )
}
