import { useEffect } from 'react'
import { PLANET_LABELS } from '../engine'
import type { SpacecraftTransit } from '../solarSystem'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'

interface SpacecraftTooltipProps {
  /** Screen-pixel anchor for the currently-selected spacecraft marker, updated every frame; `null` when nothing is selected. */
  position: MarkerScreenPosition | null
  selection: SpacecraftTransit | null
  onDismiss: () => void
}

// UTC, since a SpacecraftTransit's departure/arrival dates are plain calendar
// dates (e.g. "2020-07-30") with no meaningful time-of-day - parsed as UTC
// midnight per the Date constructor's handling of bare ISO date strings, so
// formatting in UTC too shows the same calendar date the data was authored
// with, regardless of the viewer's own timezone.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/**
 * A popup anchored to whichever in-transit spacecraft marker is selected in
 * the solar system view - the same "anchored to the clicked marker" pattern
 * as `MarkerTooltip` in the body view, just for a different selection shape
 * (a `SpacecraftTransit` rather than a ground station/celestial object), so
 * kept as its own small component rather than overloading that one.
 */
export function SpacecraftTooltip({ position, selection, onDismiss }: SpacecraftTooltipProps) {
  const isOpen = position !== null

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onDismiss])

  if (!isOpen || !selection) return null

  return (
    <div
      className="absolute z-20 w-64 rounded-lg bg-slate-900/95 p-2.5 text-xs text-slate-100 shadow-lg backdrop-blur"
      style={{ left: position.xPx, top: position.yPx, transform: 'translate(-50%, calc(-100% - 12px))' }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="absolute top-1 right-1 px-1 text-slate-400 hover:text-slate-100"
      >
        ×
      </button>

      <p className="pr-4 font-medium">{selection.name}</p>
      <p className="text-slate-400">{selection.agency}</p>
      <p className="text-slate-400">
        {PLANET_LABELS[selection.departureBody]} → {PLANET_LABELS[selection.arrivalBody]}:{' '}
        {dateFormatter.format(new Date(selection.departureDate))} –{' '}
        {dateFormatter.format(new Date(selection.arrivalDate))}
      </p>
      <p className="mt-1 text-slate-300">{selection.description}</p>
      <p className="mt-1 text-slate-500">Idealized transfer path - not a published trajectory.</p>

      <div
        aria-hidden="true"
        className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900/95"
      />
    </div>
  )
}
