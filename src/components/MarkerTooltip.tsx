import { useEffect } from 'react'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import type { CelestialObjectSelection, GroundStationSelection } from '../three/OrbitScene'
import { clampToViewportWidth } from './clampToViewport'

/** Half of the tooltip's rendered width (the `w-56` class below - 14rem/2 = 7rem = 112px at the default 16px root font size). */
const TOOLTIP_HALF_WIDTH_PX = 112

interface MarkerTooltipProps {
  /** Screen-pixel anchor for the currently-selected marker, updated every frame as the camera moves; `null` when nothing is selected. */
  position: MarkerScreenPosition | null
  groundStationSelection: GroundStationSelection | null
  celestialObjectSelection: CelestialObjectSelection | null
  /** Shown as a "use for pass prediction" action on a selected ground station; omitted (no button) outside track-real mode. */
  onUseForPassPrediction?: () => void
  onDismiss: () => void
}

/**
 * A popup anchored directly to whichever marker - a ground station pin, a
 * celestial surface-object pin, or an orbiter marker (Moon/Mars) - is
 * currently selected, instead of routing that info into the Settings panel.
 * `position` is recomputed every frame by `OrbitScene` as the camera orbits/
 * zooms, so the popup tracks the marker; it's hidden entirely while the
 * marker is occluded by the central body (see `markerScreenPosition.ts`) or
 * nothing is selected.
 */
export function MarkerTooltip({
  position,
  groundStationSelection,
  celestialObjectSelection,
  onUseForPassPrediction,
  onDismiss,
}: MarkerTooltipProps) {
  const isOpen = position !== null && !position.occluded

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onDismiss])

  if (!isOpen) return null
  if (!groundStationSelection && !celestialObjectSelection) return null

  // Clamp horizontally so the tooltip (centered on the marker by default,
  // via the transform below) can't overflow off the left/right edge of a
  // narrow viewport - the marker itself can be anywhere on screen, including
  // right at the edge. `TOOLTIP_HALF_WIDTH_PX` must track the `w-56` class
  // below. Vertical clamping is a known gap (a marker very near the top edge
  // can still clip the tooltip above it).
  const clampedLeftPx = clampToViewportWidth(position.xPx, TOOLTIP_HALF_WIDTH_PX)

  return (
    <div
      className="fixed z-20 w-56 rounded-lg bg-slate-900/95 p-2.5 text-xs text-slate-100 shadow-lg backdrop-blur"
      style={{ left: clampedLeftPx, top: position.yPx, transform: 'translate(-50%, calc(-100% - 12px))' }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="absolute top-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-100"
      >
        ×
      </button>

      {groundStationSelection && (
        <>
          <p className="pr-10 font-medium">{groundStationSelection.station.name}</p>
          <p className="text-slate-400">
            {groundStationSelection.categoryLabel} · {groundStationSelection.station.latitudeDeg.toFixed(2)}°,{' '}
            {groundStationSelection.station.longitudeDeg.toFixed(2)}°
          </p>
          {onUseForPassPrediction && (
            <button
              type="button"
              onClick={onUseForPassPrediction}
              className="mt-1.5 rounded bg-sky-500 px-2 py-1 text-white hover:bg-sky-400"
            >
              Use for pass prediction
            </button>
          )}
        </>
      )}

      {celestialObjectSelection && (
        <>
          <p className="pr-10 font-medium">{celestialObjectSelection.object.name}</p>
          <p className="text-slate-400">
            {celestialObjectSelection.object.mission} · {celestialObjectSelection.object.agency}
          </p>
          <p className="text-slate-400">
            {celestialObjectSelection.object.date} ·{' '}
            {celestialObjectSelection.object.status === 'active' ? 'Active' : 'Inactive'}
            {celestialObjectSelection.kind === 'surface' &&
              ` · ${celestialObjectSelection.object.latitudeDeg.toFixed(2)}°, ${celestialObjectSelection.object.longitudeDeg.toFixed(2)}°`}
          </p>
          <p className="mt-1 text-slate-300">{celestialObjectSelection.object.description}</p>
        </>
      )}

      <div
        aria-hidden="true"
        className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900/95"
      />
    </div>
  )
}
