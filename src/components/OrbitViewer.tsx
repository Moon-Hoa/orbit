import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type GeodeticCoordinates, orbitalPeriodSeconds } from '../engine'
import { type Scenario, decodeScenario, encodeScenario } from '../scenario'
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
import { GroundStationPanel } from './GroundStationPanel'
import { GroundTrackView } from './GroundTrackView'
import { ModeToggle, type ViewerMode } from './ModeToggle'
import { PlaybackControls } from './PlaybackControls'
import { SatelliteSearch } from './SatelliteSearch'
import { ShareButton } from './ShareButton'
import { StatsPanel } from './StatsPanel'

/** NORAD catalog number for the ISS - used as the default when entering track-real mode. */
const ISS_NORAD_ID = '25544'

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function urlForScenario(scenario: Scenario): string {
  const params = encodeScenario(scenario)
  return `${window.location.pathname}?${params.toString()}`
}

/**
 * Thin React boundary around the Three.js scene: owns UI state (elements,
 * selected real satellite, playback) and pushes it into the OrbitScene
 * instance imperatively, rather than letting React re-render drive the
 * render loop.
 *
 * The current scenario (mode, elements/satellite, speed, camera) is kept
 * synced to the URL: continuous edits (slider drags) use replaceState so
 * they don't spam browser history, while discrete actions (mode switch,
 * preset select, satellite pick) use pushState, so the back button steps
 * through them like an undo stack.
 */
export function OrbitViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbitScene | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const timeReadoutRef = useRef<HTMLSpanElement>(null)
  const currentAltitudeRef = useRef<HTMLSpanElement>(null)
  const currentSpeedRef = useRef<HTMLSpanElement>(null)
  const isApplyingHistoryRef = useRef(false)
  const pendingHistoryPushRef = useRef(false)

  const [initialScenario] = useState(() => decodeScenario(currentSearchParams()))

  const [elements, setElements] = useState(() =>
    initialScenario?.mode === 'design' ? initialScenario.elements : ISS_LIKE_ELEMENTS,
  )
  const [mode, setMode] = useState<ViewerMode>(() => initialScenario?.mode ?? 'design')
  const [selectedTle, setSelectedTle] = useState<TleRecord | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(
    () => initialScenario?.speedMultiplier ?? 60,
  )
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

  /** Marks the next URL sync as a history checkpoint (pushState) rather than a silent update. */
  function markDiscreteChange() {
    pendingHistoryPushRef.current = true
  }

  const buildCurrentScenario = useCallback((): Scenario | null => {
    if (mode === 'track-real' && !selectedTle) return null
    const camera = sceneRef.current?.getCameraState()
    if (mode === 'track-real' && selectedTle) {
      return { mode: 'track-real', noradId: selectedTle.noradId, speedMultiplier, camera }
    }
    return { mode: 'design', elements, speedMultiplier, camera }
  }, [mode, selectedTle, elements, speedMultiplier])

  // Mount once: create the scene and start its render loop. Later element/
  // playback/mode changes are pushed via the effects below, not by remounting.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new OrbitScene(container, {
      initialElements: elements,
      initialCamera: initialScenario?.camera,
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

  // Default to the ISS (or the URL's satellite) the first time track-real mode is entered.
  useEffect(() => {
    if (mode === 'track-real' && !selectedTle) {
      const noradId = initialScenario?.mode === 'track-real' ? initialScenario.noradId : ISS_NORAD_ID
      fetchByNoradId(noradId)
        .then(setSelectedTle)
        .catch(() => {
          // Best-effort default; the user can still search manually.
        })
    }
  }, [mode, selectedTle, initialScenario])

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

  // Keep the URL in sync with the current scenario.
  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false
      return
    }

    const scenario = buildCurrentScenario()
    if (!scenario) return
    const url = urlForScenario(scenario)

    if (pendingHistoryPushRef.current) {
      pendingHistoryPushRef.current = false
      window.history.pushState(null, '', url)
    } else {
      window.history.replaceState(null, '', url)
    }
  }, [buildCurrentScenario])

  // Back/forward navigation re-applies the decoded scenario from the URL.
  useEffect(() => {
    function handlePopState() {
      const scenario = decodeScenario(currentSearchParams())
      if (!scenario) return

      isApplyingHistoryRef.current = true
      setMode(scenario.mode)
      setSpeedMultiplier(scenario.speedMultiplier)
      if (scenario.mode === 'design') {
        setElements(scenario.elements)
        setSelectedTle(null)
      } else {
        fetchByNoradId(scenario.noradId)
          .then(setSelectedTle)
          .catch(() => {
            // Leave whatever was previously selected if this fails.
          })
      }
      if (scenario.camera) sceneRef.current?.setCameraState(scenario.camera)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function getShareUrl(): string | null {
    const scenario = buildCurrentScenario()
    if (!scenario) return null
    return `${window.location.origin}${urlForScenario(scenario)}`
  }

  return (
    <div className="relative h-screen w-screen bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {mode === 'design' ? (
        <ElementPanel
          elements={elements}
          onChange={setElements}
          onSelectPreset={(presetElements) => {
            markDiscreteChange()
            setElements(presetElements)
          }}
        />
      ) : (
        <SatelliteSearch
          selectedTle={selectedTle}
          onSelect={(tle) => {
            markDiscreteChange()
            setSelectedTle(tle)
          }}
        />
      )}
      <StatsPanel
        orbitShape={orbitShape}
        currentAltitudeRef={currentAltitudeRef}
        currentSpeedRef={currentSpeedRef}
      />
      {isTrackingReal && <GroundStationPanel tle={selectedTle} />}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <ModeToggle
            mode={mode}
            onChange={(nextMode) => {
              markDiscreteChange()
              setMode(nextMode)
            }}
          />
          <ShareButton getShareUrl={getShareUrl} />
        </div>
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
