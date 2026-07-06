import { useEffect, useRef, useState } from 'react'
import { PLANET_LABELS } from '../engine'
import type { SpacecraftTransit } from '../solarSystem'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import { SolarSystemScene } from '../three/SolarSystemScene'
import { SolarSystemTimeControls } from './SolarSystemTimeControls'
import { SpacecraftTooltip } from './SpacecraftTooltip'
import { ViewModeSelector, type ViewMode } from './ViewModeSelector'

interface SolarSystemViewerProps {
  /** Called to switch back to the body view. Defaults to a no-op, for tests/callers that don't care about it. */
  onViewModeChange?: (viewMode: ViewMode) => void
}

/** Default playback speed: 1 simulated week per real second - fast enough to see planets move, slow enough to still land on a specific date via "sync to now" or the date picker. */
const DEFAULT_SPEED_DAYS_PER_SECOND = 7

const dateReadoutFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

/**
 * The heliocentric solar system view: the Sun, the terrestrial planets, and
 * whichever hand-curated interplanetary missions are currently in transit -
 * see the solar-system-view issue. A separate top-level view from the
 * Earth/Moon/Mars body view (`OrbitViewer`), not an extension of it (a
 * different spatial scale and a different data problem entirely) - switched
 * between via `ViewModeSelector`, rendered in both.
 */
export function SolarSystemViewer({ onViewModeChange = () => {} }: SolarSystemViewerProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SolarSystemScene | null>(null)
  const dateReadoutRef = useRef<HTMLSpanElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speedDaysPerSecond, setSpeedDaysPerSecond] = useState(DEFAULT_SPEED_DAYS_PER_SECOND)
  const [inTransit, setInTransit] = useState<SpacecraftTransit[]>([])
  const [spacecraftSelection, setSpacecraftSelection] = useState<SpacecraftTransit | null>(null)
  const [markerScreenPosition, setMarkerScreenPosition] = useState<MarkerScreenPosition | null>(null)

  // Mount once: create the scene and start its render loop, mirroring
  // OrbitViewer's pattern - later play/speed changes are pushed via the
  // effects below, not by remounting.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new SolarSystemScene(container, {
      onTick: (date) => {
        if (dateReadoutRef.current) {
          dateReadoutRef.current.textContent = dateReadoutFormatter.format(date)
        }
      },
      onInTransitUpdate: setInTransit,
      onSpacecraftSelect: setSpacecraftSelection,
      onSelectionClear: () => setSpacecraftSelection(null),
      onSelectedMarkerPositionUpdate: setMarkerScreenPosition,
    })
    sceneRef.current = scene
    scene.start()

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isPlaying) sceneRef.current?.play()
    else sceneRef.current?.pause()
  }, [isPlaying])

  useEffect(() => {
    sceneRef.current?.setSpeedDaysPerSecond(speedDaysPerSecond)
  }, [speedDaysPerSecond])

  return (
    <div className="relative h-screen w-screen bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-4 left-4 max-h-[45vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-slate-900/80 p-3 text-xs text-slate-100 backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Currently in transit</h2>
        {inTransit.length === 0 ? (
          <p className="text-slate-400">No spacecraft currently in transit at this date.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {inTransit.map((transit) => (
              <li key={transit.id} className="text-slate-200">
                {transit.name}
                <span className="text-slate-400">
                  {' '}
                  ({PLANET_LABELS[transit.departureBody]} → {PLANET_LABELS[transit.arrivalBody]})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="absolute top-4 right-4">
        <ViewModeSelector viewMode="solar-system" onChange={onViewModeChange} />
      </div>

      <SolarSystemTimeControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
        speedDaysPerSecond={speedDaysPerSecond}
        onSpeedChange={setSpeedDaysPerSecond}
        onSyncToNow={() => sceneRef.current?.syncToNow()}
        onJumpToDate={(date) => sceneRef.current?.setDate(date)}
        dateReadoutRef={dateReadoutRef}
      />

      <SpacecraftTooltip
        position={markerScreenPosition}
        selection={spacecraftSelection}
        onDismiss={() => sceneRef.current?.clearSelection()}
      />
    </div>
  )
}
