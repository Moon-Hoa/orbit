import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GeodeticCoordinates } from '../engine'
import { orbitalPeriodSeconds } from '../engine'
import { type Preset, type Scenario, decodeScenario, encodeScenario } from '../scenario'
import {
  type TleRecord,
  approximateElementsFromTle,
  fetchByNoradId,
  orbitalPeriodSecondsFromTle,
} from '../satellite'
import {
  type CompanionEntry,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_PRIMARY_MARKER_COLOR,
  MAX_COMPANIONS,
  nextCompanionColor,
} from './companions'
import { OrbitScene, PRIMARY_OBJECT_ID } from '../three/OrbitScene'
import { ISS_LIKE_ELEMENTS } from '../three/sampleOrbits'
import { type UnitSystem, formatDistanceKm, formatSpeedKmS } from './distanceUnits'
import { ElementPanel } from './ElementPanel'
import { ExportControls } from './ExportControls'
import { formatElapsed } from './formatElapsed'
import { GroundStationPanel } from './GroundStationPanel'
import { GroundTrackView, type GroundTrack } from './GroundTrackView'
import { HohmannPlanner } from './HohmannPlanner'
import { ModeToggle, type ViewerMode } from './ModeToggle'
import { PlaybackControls } from './PlaybackControls'
import { SatelliteSearch } from './SatelliteSearch'
import { SettingsPanel } from './SettingsPanel'
import { ShareButton } from './ShareButton'
import { StatsPanel } from './StatsPanel'

/** NORAD catalog number for the ISS - used as the default when entering track-real mode. */
const ISS_NORAD_ID = '25544'

const UNIT_SYSTEM_STORAGE_KEY = 'orbit:unit-system'

function loadStoredUnitSystem(): UnitSystem {
  return localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY) === 'imperial' ? 'imperial' : 'metric'
}

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function urlForScenario(scenario: Scenario): string {
  const params = encodeScenario(scenario)
  return `${window.location.pathname}?${params.toString()}`
}

/**
 * Thin React boundary around the Three.js scene: owns UI state (elements,
 * selected real satellite, companions, playback) and pushes it into the
 * OrbitScene instance imperatively, rather than letting React re-render
 * drive the render loop.
 *
 * The current scenario (mode, elements/satellite, speed, camera) is kept
 * synced to the URL: continuous edits (slider drags) use replaceState so
 * they don't spam browser history, while discrete actions (mode switch,
 * preset select, satellite pick) use pushState, so the back button steps
 * through them like an undo stack. Companion objects are not part of the
 * shareable URL yet (see scenario/urlCodec.ts) - shared links reproduce the
 * primary object only.
 */
export function OrbitViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbitScene | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const timeReadoutRef = useRef<HTMLSpanElement>(null)
  const currentAltitudeRef = useRef<HTMLSpanElement>(null)
  const currentSpeedRef = useRef<HTMLSpanElement>(null)
  const currentEclipseStatusRef = useRef<HTMLSpanElement>(null)
  const isApplyingHistoryRef = useRef(false)
  const pendingHistoryPushRef = useRef(false)
  const companionsRef = useRef<CompanionEntry[]>([])
  const unitSystemRef = useRef<UnitSystem>('metric')

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
  const [companions, setCompanions] = useState<CompanionEntry[]>([])
  const [focusedId, setFocusedId] = useState<string>(PRIMARY_OBJECT_ID)
  const [groundTracks, setGroundTracks] = useState<GroundTrack[]>([])
  const [subsolarPoint, setSubsolarPoint] = useState<GeodeticCoordinates | null>(null)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(loadStoredUnitSystem)
  const [enableJ2, setEnableJ2] = useState(false)

  useEffect(() => {
    companionsRef.current = companions
  }, [companions])

  useEffect(() => {
    unitSystemRef.current = unitSystem
    localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem)
  }, [unitSystem])

  const isTrackingReal = mode === 'track-real' && selectedTle !== null

  // Focus follows the primary object whenever it's replaced (a new search
  // selection, a new preset, or a mode switch); companions stay put so
  // comparisons persist across edits to the thing being compared against.
  useEffect(() => {
    setFocusedId(PRIMARY_OBJECT_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, elements, selectedTle])

  const periodSeconds = useMemo(() => {
    if (isTrackingReal) return orbitalPeriodSecondsFromTle(selectedTle, new Date())
    return orbitalPeriodSeconds(elements.semiMajorAxisKm)
  }, [isTrackingReal, selectedTle, elements.semiMajorAxisKm])

  const focusedCompanion = companions.find((companion) => companion.id === focusedId)

  const primaryLabel = isTrackingReal ? selectedTle.name : 'Design orbit'

  const orbitShape = useMemo(() => {
    if (focusedCompanion) {
      return focusedCompanion.source.type === 'real'
        ? approximateElementsFromTle(focusedCompanion.source.tle, new Date())
        : {
            semiMajorAxisKm: focusedCompanion.source.elements.semiMajorAxisKm,
            eccentricity: focusedCompanion.source.elements.eccentricity,
          }
    }
    if (isTrackingReal) return approximateElementsFromTle(selectedTle, new Date())
    return { semiMajorAxisKm: elements.semiMajorAxisKm, eccentricity: elements.eccentricity }
  }, [focusedCompanion, isTrackingReal, selectedTle, elements.semiMajorAxisKm, elements.eccentricity])

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
      onTick: ({ simTimeSeconds, altitudeKm, speedKmS, shadowFraction }) => {
        if (scrubRef.current) scrubRef.current.value = String(simTimeSeconds)
        if (timeReadoutRef.current) {
          timeReadoutRef.current.textContent = formatElapsed(simTimeSeconds)
        }
        if (currentAltitudeRef.current) {
          currentAltitudeRef.current.textContent = formatDistanceKm(altitudeKm, unitSystemRef.current)
        }
        if (currentSpeedRef.current) {
          currentSpeedRef.current.textContent = formatSpeedKmS(speedKmS, unitSystemRef.current)
        }
        if (currentEclipseStatusRef.current) {
          currentEclipseStatusRef.current.textContent =
            shadowFraction === null ? '—' : shadowFraction > 0 ? 'In eclipse' : 'In sunlight'
        }
      },
      onGroundTrackUpdate: (tracks) => {
        setGroundTracks(
          tracks.map(({ id, points }) => {
            if (id === PRIMARY_OBJECT_ID) {
              return {
                id,
                pathColor: DEFAULT_PRIMARY_COLOR,
                markerColor: DEFAULT_PRIMARY_MARKER_COLOR,
                points,
              }
            }
            const companion = companionsRef.current.find((c) => c.id === id)
            const color = companion?.color ?? DEFAULT_PRIMARY_COLOR
            return { id, pathColor: color, markerColor: color, points }
          }),
        )
      },
      onSolarUpdate: setSubsolarPoint,
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
    if (mode === 'design') sceneRef.current?.setDesignElements(elements, enableJ2)
  }, [elements, mode, enableJ2])

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

  function addRealSatelliteCompanion(tle: TleRecord) {
    const id = `real:${tle.noradId}`
    if (companions.some((c) => c.id === id) || companions.length >= MAX_COMPANIONS) return
    const color = nextCompanionColor(companions.length)
    sceneRef.current?.addRealSatelliteCompanion(id, tle, color)
    setCompanions((prev) => [...prev, { id, label: tle.name, color, source: { type: 'real', tle } }])
  }

  function addDesignCompanion(preset: Preset) {
    const id = `design:${preset.id}`
    if (companions.some((c) => c.id === id) || companions.length >= MAX_COMPANIONS) return
    const color = nextCompanionColor(companions.length)
    sceneRef.current?.addDesignCompanion(id, preset.elements, color)
    setCompanions((prev) => [
      ...prev,
      { id, label: preset.label, color, source: { type: 'design', elements: preset.elements } },
    ])
  }

  function removeCompanion(id: string) {
    sceneRef.current?.removeObject(id)
    setCompanions((prev) => prev.filter((c) => c.id !== id))
    if (focusedId === id) setFocusedId(PRIMARY_OBJECT_ID)
  }

  function focusObject(id: string) {
    setFocusedId(id)
    sceneRef.current?.setFocusedObject(id)
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
          onAddCompanion={addDesignCompanion}
          enableJ2={enableJ2}
          onEnableJ2Change={setEnableJ2}
        />
      ) : (
        <SatelliteSearch
          selectedTle={selectedTle}
          onSelect={(tle) => {
            markDiscreteChange()
            setSelectedTle(tle)
          }}
          onAddCompanion={addRealSatelliteCompanion}
        />
      )}
      <StatsPanel
        orbitShape={orbitShape}
        currentAltitudeRef={currentAltitudeRef}
        currentSpeedRef={currentSpeedRef}
        currentEclipseStatusRef={currentEclipseStatusRef}
        showEclipseStatus={isTrackingReal && focusedId === PRIMARY_OBJECT_ID}
        unitSystem={unitSystem}
        primaryLabel={primaryLabel}
        companions={companions}
        focusedId={focusedId}
        onFocus={focusObject}
        onRemoveCompanion={removeCompanion}
      />
      {isTrackingReal && <GroundStationPanel tle={selectedTle} />}
      {mode === 'design' && <HohmannPlanner />}
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
          <SettingsPanel unitSystem={unitSystem} onUnitSystemChange={setUnitSystem} />
        </div>
        <GroundTrackView tracks={groundTracks} subsolarPoint={subsolarPoint} />
        <ExportControls
          label={primaryLabel}
          isTrackingReal={isTrackingReal}
          elements={elements}
          enableJ2={enableJ2}
          tle={selectedTle}
        />
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
