import { useEffect, useMemo, useRef, useState } from 'react'
import { type GeodeticCoordinates, orbitalPeriodSeconds } from '../engine'
import {
  type TleRecord,
  approximateElementsFromTle,
  fetchByNoradId,
  orbitalPeriodSecondsFromTle,
} from '../satellite'
import { OrbitScene } from '../three/OrbitScene'
import { ISS_LIKE_ELEMENTS } from '../three/sampleOrbits'
import { ElementPanel } from './ElementPanel'
import { formatElapsed } from './formatElapsed'
import { GroundTrackView } from './GroundTrackView'
import { ModeToggle, type ViewerMode } from './ModeToggle'
import { PlaybackControls } from './PlaybackControls'
import { SatelliteSearch } from './SatelliteSearch'
import { StatsPanel } from './StatsPanel'

/** NORAD catalog number for the ISS - used as the default when entering track-real mode. */
const ISS_NORAD_ID = '25544'

/**
 * Thin React boundary around the Three.js scene: owns UI state (elements,
 * selected real satellite, playback) and pushes it into the OrbitScene
 * instance imperatively, rather than letting React re-render drive the
 * render loop.
 */
export function OrbitViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbitScene | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const timeReadoutRef = useRef<HTMLSpanElement>(null)
  const currentAltitudeRef = useRef<HTMLSpanElement>(null)
  const currentSpeedRef = useRef<HTMLSpanElement>(null)

  const [elements, setElements] = useState(ISS_LIKE_ELEMENTS)
  const [mode, setMode] = useState<ViewerMode>('design')
  const [selectedTle, setSelectedTle] = useState<TleRecord | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(60)
  const [groundTrackPoints, setGroundTrackPoints] = useState<GeodeticCoordinates[]>([])

  const isTrackingReal = mode === 'track-real' && selectedTle !== null

  const periodSeconds = useMemo(() => {
    if (isTrackingReal) return orbitalPeriodSecondsFromTle(selectedTle, new Date())
    return orbitalPeriodSeconds(elements.semiMajorAxisKm)
  }, [isTrackingReal, selectedTle, elements.semiMajorAxisKm])

  const orbitShape = useMemo(() => {
    if (isTrackingReal) return approximateElementsFromTle(selectedTle, new Date())
    return { semiMajorAxisKm: elements.semiMajorAxisKm, eccentricity: elements.eccentricity }
  }, [isTrackingReal, selectedTle, elements.semiMajorAxisKm, elements.eccentricity])

  // Mount once: create the scene and start its render loop. Later element/
  // playback/mode changes are pushed via the effects below, not by remounting.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new OrbitScene(container, {
      initialElements: elements,
      onTick: ({ simTimeSeconds, altitudeKm, speedKmS }) => {
        if (scrubRef.current) scrubRef.current.value = String(simTimeSeconds)
        if (timeReadoutRef.current) {
          timeReadoutRef.current.textContent = formatElapsed(simTimeSeconds)
        }
        if (currentAltitudeRef.current) {
          currentAltitudeRef.current.textContent = `${altitudeKm.toFixed(1)} km`
        }
        if (currentSpeedRef.current) {
          currentSpeedRef.current.textContent = `${speedKmS.toFixed(2)} km/s`
        }
      },
      onGroundTrackUpdate: setGroundTrackPoints,
    })
    sceneRef.current = scene
    scene.start()

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Default to the ISS the first time the user switches into track-real mode.
  useEffect(() => {
    if (mode === 'track-real' && !selectedTle) {
      fetchByNoradId(ISS_NORAD_ID)
        .then(setSelectedTle)
        .catch(() => {
          // Best-effort default; the user can still search manually.
        })
    }
  }, [mode, selectedTle])

  useEffect(() => {
    if (mode === 'design') sceneRef.current?.setDesignElements(elements)
  }, [elements, mode])

  useEffect(() => {
    if (mode === 'track-real' && selectedTle) sceneRef.current?.setRealSatellite(selectedTle)
  }, [mode, selectedTle])

  useEffect(() => {
    if (isPlaying) sceneRef.current?.play()
    else sceneRef.current?.pause()
  }, [isPlaying])

  useEffect(() => {
    sceneRef.current?.setSpeedMultiplier(speedMultiplier)
  }, [speedMultiplier])

  return (
    <div className="relative h-screen w-screen bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {mode === 'design' ? (
        <ElementPanel elements={elements} onChange={setElements} />
      ) : (
        <SatelliteSearch selectedTle={selectedTle} onSelect={setSelectedTle} />
      )}
      <StatsPanel
        orbitShape={orbitShape}
        currentAltitudeRef={currentAltitudeRef}
        currentSpeedRef={currentSpeedRef}
      />
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <ModeToggle mode={mode} onChange={setMode} />
        <GroundTrackView points={groundTrackPoints} />
      </div>
      <PlaybackControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
        speedMultiplier={speedMultiplier}
        onSpeedChange={setSpeedMultiplier}
        periodSeconds={periodSeconds}
        onScrub={(event) => sceneRef.current?.seek(Number(event.target.value))}
        onJumpToEpoch={() => sceneRef.current?.seek(0)}
        scrubRef={scrubRef}
        timeReadoutRef={timeReadoutRef}
      />
    </div>
  )
}
