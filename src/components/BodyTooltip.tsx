import { useEffect } from 'react'
import { MOON_LABELS, OTHER_BODY_LABELS, PLANET_LABELS, type PlanetId } from '../engine'
import { MOON_INFO, OTHER_BODY_INFO, PLANET_INFO } from '../solarSystem'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import type { SolarSystemBodySelection } from '../three/SolarSystemScene'
import { clampToViewportWidth } from './clampToViewport'

/** Half of the tooltip's rendered width (the `w-64` class below - 16rem/2 = 8rem = 128px at the default 16px root font size). */
const TOOLTIP_HALF_WIDTH_PX = 128

interface BodyTooltipProps {
  /** Screen-pixel anchor for the currently-selected body, updated every frame; `null` when nothing is selected. */
  position: MarkerScreenPosition | null
  selection: SolarSystemBodySelection | null
  onDismiss: () => void
  /** Called when the "Center view" button (planets only) is clicked - see the "click a planet to center it" issue. */
  onCenterView: (planet: PlanetId) => void
}

function bodyLabelAndInfo(selection: SolarSystemBodySelection): { label: string; info: string } {
  switch (selection.kind) {
    case 'planet':
      return { label: PLANET_LABELS[selection.planet], info: PLANET_INFO[selection.planet] }
    case 'moon':
      return { label: MOON_LABELS[selection.moon], info: MOON_INFO[selection.moon] }
    case 'other-body':
      return { label: OTHER_BODY_LABELS[selection.body], info: OTHER_BODY_INFO[selection.body] }
  }
}

/**
 * A popup anchored to whichever planet, moon, or "other body" is currently
 * selected in the solar system view - the non-spacecraft counterpart to
 * `SpacecraftTooltip` (kept separate since the content differs: a short
 * hand-authored fact rather than mission dates/agency, plus a "Center view"
 * button that's only meaningful for planets - a bare click on a planet
 * selects it, the same as any other body, rather than also moving the
 * camera; centering is this button's job instead, so the two actions don't
 * fight over a single click).
 */
export function BodyTooltip({ position, selection, onDismiss, onCenterView }: BodyTooltipProps) {
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

  const { label, info } = bodyLabelAndInfo(selection)

  // See SpacecraftTooltip's identical clamp - keeps the tooltip on-screen
  // when its anchor is near the left/right edge of a narrow viewport.
  const clampedLeftPx = clampToViewportWidth(position.xPx, TOOLTIP_HALF_WIDTH_PX)

  return (
    <div
      className="fixed z-20 w-64 rounded-lg bg-slate-900/95 p-2.5 text-xs text-slate-100 shadow-lg backdrop-blur"
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

      <p className="pr-10 font-medium">{label}</p>
      <p className="mt-1 text-slate-300">{info}</p>

      {selection.kind === 'planet' && (
        <button
          type="button"
          onClick={() => onCenterView(selection.planet)}
          className="mt-2 rounded bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
        >
          Center view
        </button>
      )}

      <div
        aria-hidden="true"
        className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900/95"
      />
    </div>
  )
}
