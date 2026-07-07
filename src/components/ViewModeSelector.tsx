import { useState } from 'react'
import type { CentralBodyId, PlanetId } from '../engine'
import { CentralBodySelector } from './CentralBodySelector'
import { PlanetFocusSelector } from './PlanetFocusSelector'

export type ViewMode = 'body' | 'solar-system'

interface ViewModeSelectorProps {
  viewMode: ViewMode
  onChange: (viewMode: ViewMode) => void
  /** Body-view only - the currently-selected central body and how to change it, shown as a dropdown when "Body view" is clicked while already active. */
  centralBody?: CentralBodyId
  onCentralBodyChange?: (id: CentralBodyId) => void
  /** Solar-system-view only - the currently-focused planet (if any) and how to change it, shown as a dropdown when "Solar system view" is clicked while already active. */
  focusedPlanet?: PlanetId | null
  onFocusPlanet?: (planet: PlanetId) => void
}

/**
 * Toggle between the Earth/Moon/Mars body view and the solar system view -
 * the two top-level, independently-scaled scenes this app renders. Also
 * hosts each mode's own contextual dropdown (which central body / which
 * planet to focus on), opened by clicking the already-active mode's button
 * again, rather than a separate always-visible row of body/planet buttons -
 * see the nav-overhaul issue.
 */
export function ViewModeSelector({
  viewMode,
  onChange,
  centralBody,
  onCentralBodyChange,
  focusedPlanet,
  onFocusPlanet,
}: ViewModeSelectorProps) {
  const [isBodyDropdownOpen, setIsBodyDropdownOpen] = useState(false)
  const [isPlanetDropdownOpen, setIsPlanetDropdownOpen] = useState(false)

  return (
    // No `overflow-hidden` here (unlike a plain toggle) - each mode's
    // dropdown is an absolutely-positioned descendant that needs to render
    // *outside* this wrapper's own small pill-shaped box, and overflow
    // clipping would hide it entirely despite it being correctly positioned
    // (clipping affects paint, not layout geometry - the dropdown would
    // still measure as "there" while being invisible). The pill's rounded
    // corners come from rounding each end button directly instead.
    <div className="relative flex rounded-lg bg-slate-900/80 backdrop-blur">
      <button
        type="button"
        onClick={() => {
          if (viewMode === 'body') setIsBodyDropdownOpen((open) => !open)
          else onChange('body')
        }}
        aria-pressed={viewMode === 'body'}
        aria-expanded={viewMode === 'body' ? isBodyDropdownOpen : undefined}
        aria-haspopup={viewMode === 'body' ? 'true' : undefined}
        className={`rounded-l-lg px-3 py-1.5 text-sm ${
          viewMode === 'body' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Body view
      </button>
      <button
        type="button"
        onClick={() => {
          if (viewMode === 'solar-system') setIsPlanetDropdownOpen((open) => !open)
          else onChange('solar-system')
        }}
        aria-pressed={viewMode === 'solar-system'}
        aria-expanded={viewMode === 'solar-system' ? isPlanetDropdownOpen : undefined}
        aria-haspopup={viewMode === 'solar-system' ? 'true' : undefined}
        className={`rounded-r-lg px-3 py-1.5 text-sm ${
          viewMode === 'solar-system' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        Solar system view
      </button>

      {isBodyDropdownOpen && centralBody && onCentralBodyChange && (
        <div className="absolute top-full left-0 z-10 mt-1">
          <CentralBodySelector
            centralBody={centralBody}
            onChange={(id) => {
              onCentralBodyChange(id)
              setIsBodyDropdownOpen(false)
            }}
          />
        </div>
      )}

      {isPlanetDropdownOpen && onFocusPlanet && (
        <div className="absolute top-full right-0 z-10 mt-1">
          <PlanetFocusSelector
            focusedPlanet={focusedPlanet ?? null}
            onFocusPlanet={(planet) => {
              onFocusPlanet(planet)
              setIsPlanetDropdownOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
