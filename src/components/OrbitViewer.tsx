import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CENTRAL_BODIES,
  type CentralBodyId,
  DEFAULT_CENTRAL_BODY_ID,
  type GeodeticCoordinates,
  orbitalPeriodSeconds,
} from '../engine'
import { type Preset, PRESETS, type Scenario, decodeScenario, encodeScenario } from '../scenario'
import {
  type TleRecord,
  approximateElementsFromTle,
  fetchByNoradId,
  orbitalPeriodSecondsFromTle,
} from '../satellite'
import {
  type BulkAddSummary,
  type CompanionEntry,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_PRIMARY_MARKER_COLOR,
  MAX_COMPANIONS,
  nextCompanionColor,
} from './companions'
import type { ClosestApproachResult } from '../three/closestApproach'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import {
  type CelestialObjectSelection,
  type GroundStationSelection,
  OrbitScene,
  PRIMARY_OBJECT_ID,
} from '../three/OrbitScene'
import { ISS_LIKE_ELEMENTS } from '../three/sampleOrbits'
import { type UnitSystem, formatDistanceKm, formatSpeedKmS } from './distanceUnits'
import { AccessibleDataView } from './AccessibleDataView'
import { CentralBodySelector } from './CentralBodySelector'
import { ClosestApproachPanel } from './ClosestApproachPanel'
import { ElementPanel } from './ElementPanel'
import { ExportControls } from './ExportControls'
import { formatElapsed } from './formatElapsed'
import { GroundStationPanel } from './GroundStationPanel'
import { GroundTrackView, type GroundTrack } from './GroundTrackView'
import { HohmannPlanner } from './HohmannPlanner'
import { MarkerTooltip } from './MarkerTooltip'
import { ModeToggle, type ViewerMode } from './ModeToggle'
import { PlaybackControls } from './PlaybackControls'
import { SatelliteSearch } from './SatelliteSearch'
import { SettingsPanel } from './SettingsPanel'
import { ShareButton } from './ShareButton'
import { ViewModeSelector, type ViewMode } from './ViewModeSelector'
import { StatsPanel } from './StatsPanel'

/** NORAD catalog number for the ISS - used as the default when entering track-real mode. */
const ISS_NORAD_ID = '25544'

/** How far "Sync to now, +24h" plays forward, in simulated seconds. */
const ADVANCE_WINDOW_SECONDS = 24 * 60 * 60

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
interface OrbitViewerProps {
  /** Called to switch to the solar system view. Defaults to a no-op, for tests/callers that don't care about it. */
  onViewModeChange?: (viewMode: ViewMode) => void
}

export function OrbitViewer({ onViewModeChange = () => {} }: OrbitViewerProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbitScene | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const timeReadoutRef = useRef<HTMLSpanElement>(null)
  const realTimeReadoutRef = useRef<HTMLSpanElement>(null)
  const currentAltitudeRef = useRef<HTMLSpanElement>(null)
  const currentSpeedRef = useRef<HTMLSpanElement>(null)
  const currentEclipseStatusRef = useRef<HTMLSpanElement>(null)
  const dataViewAltitudeRef = useRef<HTMLTableCellElement>(null)
  const dataViewSpeedRef = useRef<HTMLTableCellElement>(null)
  const dataViewEclipseStatusRef = useRef<HTMLTableCellElement>(null)
  const isApplyingHistoryRef = useRef(false)
  const pendingHistoryPushRef = useRef(false)
  const companionsRef = useRef<CompanionEntry[]>([])
  const unitSystemRef = useRef<UnitSystem>('metric')

  const [initialScenario] = useState(() => decodeScenario(currentSearchParams()))

  const [elements, setElements] = useState(() =>
    initialScenario?.mode === 'design' ? initialScenario.elements : ISS_LIKE_ELEMENTS,
  )
  const [mode, setMode] = useState<ViewerMode>(() => initialScenario?.mode ?? 'design')
  const [centralBodyId, setCentralBodyId] = useState<CentralBodyId>(
    () => initialScenario?.centralBody ?? DEFAULT_CENTRAL_BODY_ID,
  )
  const [selectedTle, setSelectedTle] = useState<TleRecord | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(
    () => initialScenario?.speedMultiplier ?? 60,
  )
  const [companions, setCompanions] = useState<CompanionEntry[]>([])
  const [focusedId, setFocusedId] = useState<string>(PRIMARY_OBJECT_ID)
  const [groundTracks, setGroundTracks] = useState<GroundTrack[]>([])
  const [subsolarPoint, setSubsolarPoint] = useState<GeodeticCoordinates | null>(null)
  const [closestApproach, setClosestApproach] = useState<ClosestApproachResult | null>(null)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(loadStoredUnitSystem)
  const [enableJ2, setEnableJ2] = useState(false)
  const [isDataViewOpen, setIsDataViewOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [visibleGroundStationCategories, setVisibleGroundStationCategories] = useState(
    () => new Set<string>(),
  )
  const [groundStationSelection, setGroundStationSelection] =
    useState<GroundStationSelection | null>(null)
  const [passPredictionRequest, setPassPredictionRequest] = useState<{
    latitudeDeg: number
    longitudeDeg: number
    nonce: number
  } | null>(null)
  const [visibleCelestialCategories, setVisibleCelestialCategories] = useState(
    () => new Set<string>(),
  )
  const [celestialOrbitersVisible, setCelestialOrbitersVisible] = useState(false)
  const [celestialObjectSelection, setCelestialObjectSelection] =
    useState<CelestialObjectSelection | null>(null)
  const [markerScreenPosition, setMarkerScreenPosition] = useState<MarkerScreenPosition | null>(null)

  /** Posts a message to the visually-hidden aria-live region, for screen readers. */
  function announce(message: string) {
    setAnnouncement(message)
  }

  useEffect(() => {
    companionsRef.current = companions
  }, [companions])

  useEffect(() => {
    unitSystemRef.current = unitSystem
    localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem)
  }, [unitSystem])

  const currentBody = CENTRAL_BODIES[centralBodyId]
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
    return orbitalPeriodSeconds(elements.semiMajorAxisKm, currentBody.muKm3S2)
  }, [isTrackingReal, selectedTle, elements.semiMajorAxisKm, currentBody.muKm3S2])

  const focusedCompanion = companions.find((companion) => companion.id === focusedId)

  const primaryLabel = isTrackingReal ? selectedTle.name : 'Design orbit'

  // Ground-track/geodetic reporting assumes Earth's rotation - only meaningful when Earth is selected.
  const currentGeodetic = currentBody.hasEarthOnlyFeatures
    ? (groundTracks.find((track) => track.id === PRIMARY_OBJECT_ID)?.points.at(-1) ?? null)
    : null

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
      return {
        mode: 'track-real',
        noradId: selectedTle.noradId,
        speedMultiplier,
        centralBody: 'earth',
        camera,
      }
    }
    return { mode: 'design', elements, speedMultiplier, centralBody: centralBodyId, camera }
  }, [mode, selectedTle, elements, speedMultiplier, centralBodyId])

  // Mount once: create the scene and start its render loop. Later element/
  // playback/mode changes are pushed via the effects below, not by remounting.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new OrbitScene(container, {
      initialElements: elements,
      initialCentralBody: centralBodyId,
      initialCamera: initialScenario?.camera,
      onTick: ({ simTimeSeconds, altitudeKm, speedKmS, shadowFraction, currentDate }) => {
        if (scrubRef.current) scrubRef.current.value = String(simTimeSeconds)
        if (timeReadoutRef.current) {
          timeReadoutRef.current.textContent = formatElapsed(simTimeSeconds)
        }
        if (realTimeReadoutRef.current) {
          realTimeReadoutRef.current.textContent = currentDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        }
        const altitudeText = formatDistanceKm(altitudeKm, unitSystemRef.current)
        if (currentAltitudeRef.current) currentAltitudeRef.current.textContent = altitudeText
        if (dataViewAltitudeRef.current) dataViewAltitudeRef.current.textContent = altitudeText

        const speedText = formatSpeedKmS(speedKmS, unitSystemRef.current)
        if (currentSpeedRef.current) currentSpeedRef.current.textContent = speedText
        if (dataViewSpeedRef.current) dataViewSpeedRef.current.textContent = speedText

        const eclipseText =
          shadowFraction === null ? '—' : shadowFraction > 0 ? 'In eclipse' : 'In sunlight'
        if (currentEclipseStatusRef.current) currentEclipseStatusRef.current.textContent = eclipseText
        if (dataViewEclipseStatusRef.current) {
          dataViewEclipseStatusRef.current.textContent = eclipseText
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
      onClosestApproachUpdate: setClosestApproach,
      onAutoPause: () => setIsPlaying(false),
      onGroundStationSelect: (selection) => {
        setGroundStationSelection(selection)
        setCelestialObjectSelection(null) // only one marker is selected at a time
      },
      onCelestialObjectSelect: (selection) => {
        setCelestialObjectSelection(selection)
        setGroundStationSelection(null)
      },
      onSelectionClear: () => {
        setGroundStationSelection(null)
        setCelestialObjectSelection(null)
      },
      onSelectedMarkerPositionUpdate: setMarkerScreenPosition,
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
        .then((tle) => {
          setSelectedTle(tle)
          announce(`Tracking ${tle.name}, NORAD ${tle.noradId}`)
        })
        .catch(() => {
          // Best-effort default; the user can still search manually.
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedTle, initialScenario])

  useEffect(() => {
    sceneRef.current?.setCentralBody(centralBodyId)
  }, [centralBodyId])

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
      setCentralBodyId(scenario.centralBody)
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

  /** Adds several real satellites as companions in one action, skipping ones already tracked and stopping once MAX_COMPANIONS is reached. */
  function addRealSatelliteCompanionsMany(tles: TleRecord[]): BulkAddSummary {
    const seenNoradIds = new Set<string>()
    const candidates = tles.filter((tle) => {
      if (companions.some((c) => c.id === `real:${tle.noradId}`)) return false
      if (seenNoradIds.has(tle.noradId)) return false
      seenNoradIds.add(tle.noradId)
      return true
    })
    const fitting = candidates.slice(0, Math.max(0, MAX_COMPANIONS - companions.length))

    const newEntries: CompanionEntry[] = fitting.map((tle, i) => {
      const color = nextCompanionColor(companions.length + i)
      sceneRef.current?.addRealSatelliteCompanion(`real:${tle.noradId}`, tle, color)
      return { id: `real:${tle.noradId}`, label: tle.name, color, source: { type: 'real', tle } }
    })
    if (newEntries.length > 0) setCompanions((prev) => [...prev, ...newEntries])

    return { addedCount: fitting.length, skippedCount: tles.length - fitting.length }
  }

  /** Adds several design-orbit presets as companions in one action, skipping ones already tracked and stopping once MAX_COMPANIONS is reached. */
  function addDesignCompanionsMany(presets: Preset[]): BulkAddSummary {
    const seenIds = new Set<string>()
    const candidates = presets.filter((preset) => {
      if (companions.some((c) => c.id === `design:${preset.id}`)) return false
      if (seenIds.has(preset.id)) return false
      seenIds.add(preset.id)
      return true
    })
    const fitting = candidates.slice(0, Math.max(0, MAX_COMPANIONS - companions.length))

    const newEntries: CompanionEntry[] = fitting.map((preset, i) => {
      const color = nextCompanionColor(companions.length + i)
      sceneRef.current?.addDesignCompanion(`design:${preset.id}`, preset.elements, color)
      return {
        id: `design:${preset.id}`,
        label: preset.label,
        color,
        source: { type: 'design', elements: preset.elements },
      }
    })
    if (newEntries.length > 0) setCompanions((prev) => [...prev, ...newEntries])

    return { addedCount: fitting.length, skippedCount: presets.length - fitting.length }
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

  function syncToNow() {
    sceneRef.current?.syncToNow()
  }

  function syncToNowAndAdvance() {
    sceneRef.current?.syncToNow()
    sceneRef.current?.setPlaybackCap(ADVANCE_WINDOW_SECONDS)
    setIsPlaying(true)
  }

  function toggleGroundStationCategory(categoryId: string, visible: boolean) {
    sceneRef.current?.setGroundStationCategoryVisible(categoryId, visible)
    setVisibleGroundStationCategories((prev) => {
      const next = new Set(prev)
      if (visible) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
  }

  function setSatelliteSwarmVisible(visible: boolean): Promise<void> {
    return sceneRef.current?.setSatelliteSwarmVisible(visible) ?? Promise.resolve()
  }

  function toggleCelestialObjectCategory(categoryId: string, visible: boolean) {
    sceneRef.current?.setCelestialObjectCategoryVisible(categoryId, visible)
    setVisibleCelestialCategories((prev) => {
      const next = new Set(prev)
      if (visible) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
  }

  function setOrbitersVisible(visible: boolean) {
    sceneRef.current?.setCelestialOrbitersVisible(visible)
    setCelestialOrbitersVisible(visible)
  }

  /**
   * Switches the scene's central body. Real-satellite tracking is Earth-only
   * (no Moon/Mars catalog), so switching away from Earth while tracking one
   * falls back to design-orbit mode with the current elements. Surface-object
   * category visibility and the selected pin/marker info are reset, since
   * each body has its own distinct catalog and category ids.
   */
  function changeCentralBody(id: CentralBodyId) {
    markDiscreteChange()
    if (id !== 'earth' && mode === 'track-real') {
      setMode('design')
      setSelectedTle(null)
    }
    setCentralBodyId(id)
    setVisibleCelestialCategories(new Set())
    setCelestialOrbitersVisible(false)
    setCelestialObjectSelection(null)
    announce(`${CENTRAL_BODIES[id].label} selected`)
  }

  function useGroundStationForPassPrediction() {
    if (!groundStationSelection) return
    setPassPredictionRequest((prev) => ({
      latitudeDeg: groundStationSelection.station.latitudeDeg,
      longitudeDeg: groundStationSelection.station.longitudeDeg,
      nonce: (prev?.nonce ?? 0) + 1,
    }))
  }

  return (
    <div className="relative h-screen w-screen bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <AccessibleDataView
        isOpen={isDataViewOpen}
        onToggle={() => setIsDataViewOpen((open) => !open)}
        mode={mode}
        primaryLabel={primaryLabel}
        selectedTle={isTrackingReal ? selectedTle : null}
        elements={elements}
        currentGeodetic={currentGeodetic}
        currentAltitudeRef={dataViewAltitudeRef}
        currentSpeedRef={dataViewSpeedRef}
        currentEclipseStatusRef={dataViewEclipseStatusRef}
        showEclipseStatus={isTrackingReal && focusedId === PRIMARY_OBJECT_ID}
        centralBodyLabel={currentBody.label}
      />

      {mode === 'design' ? (
        <ElementPanel
          elements={elements}
          onChange={setElements}
          onSelectPreset={(presetElements, label) => {
            markDiscreteChange()
            setElements(presetElements)
            announce(`${label} preset loaded`)
          }}
          onAddCompanion={addDesignCompanion}
          onAddCompanionMany={addDesignCompanionsMany}
          enableJ2={enableJ2}
          onEnableJ2Change={setEnableJ2}
          bodyRadiusKm={currentBody.radiusKm}
          bodyLabel={currentBody.label}
          presets={currentBody.hasEarthOnlyFeatures ? PRESETS : []}
        />
      ) : (
        <SatelliteSearch
          selectedTle={selectedTle}
          onSelect={(tle) => {
            markDiscreteChange()
            setSelectedTle(tle)
            announce(`Tracking ${tle.name}, NORAD ${tle.noradId}`)
          }}
          onAddCompanion={addRealSatelliteCompanion}
          onAddCompanionMany={addRealSatelliteCompanionsMany}
        />
      )}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
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
          muKm3S2={currentBody.muKm3S2}
          bodyRadiusKm={currentBody.radiusKm}
        />
        {companions.length === 1 && <ClosestApproachPanel result={closestApproach} />}
      </div>
      {isTrackingReal && <GroundStationPanel tle={selectedTle} presetLocation={passPredictionRequest} />}
      {mode === 'design' && currentBody.hasEarthOnlyFeatures && <HohmannPlanner />}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <ViewModeSelector viewMode="body" onChange={onViewModeChange} />
          <CentralBodySelector centralBody={centralBodyId} onChange={changeCentralBody} />
          <ModeToggle
            mode={mode}
            onChange={(nextMode) => {
              markDiscreteChange()
              setMode(nextMode)
              announce(nextMode === 'design' ? 'Design orbit mode' : 'Track real satellite mode')
            }}
            disableTrackReal={!currentBody.hasEarthOnlyFeatures}
          />
          <ShareButton getShareUrl={getShareUrl} />
          <SettingsPanel
            unitSystem={unitSystem}
            onUnitSystemChange={setUnitSystem}
            centralBody={centralBodyId}
            onToggleSatelliteSwarm={setSatelliteSwarmVisible}
            visibleGroundStationCategories={visibleGroundStationCategories}
            onToggleGroundStationCategory={toggleGroundStationCategory}
            visibleCelestialCategories={visibleCelestialCategories}
            onToggleCelestialCategory={toggleCelestialObjectCategory}
            celestialOrbitersVisible={celestialOrbitersVisible}
            onToggleCelestialOrbiters={setOrbitersVisible}
          />
        </div>
        {currentBody.hasEarthOnlyFeatures && (
          <>
            <GroundTrackView tracks={groundTracks} subsolarPoint={subsolarPoint} />
            <ExportControls
              label={primaryLabel}
              isTrackingReal={isTrackingReal}
              elements={elements}
              enableJ2={enableJ2}
              tle={selectedTle}
            />
          </>
        )}
      </div>
      <PlaybackControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
        speedMultiplier={speedMultiplier}
        onSpeedChange={setSpeedMultiplier}
        periodSeconds={periodSeconds}
        onScrub={(event) => sceneRef.current?.seek(Number(event.target.value))}
        onJumpToEpoch={() => sceneRef.current?.seek(0)}
        onSyncToNow={syncToNow}
        onSyncToNowAndAdvance={syncToNowAndAdvance}
        scrubRef={scrubRef}
        timeReadoutRef={timeReadoutRef}
        realTimeReadoutRef={realTimeReadoutRef}
      />
      <MarkerTooltip
        position={markerScreenPosition}
        groundStationSelection={groundStationSelection}
        celestialObjectSelection={celestialObjectSelection}
        onUseForPassPrediction={isTrackingReal ? useGroundStationForPassPrediction : undefined}
        onDismiss={() => sceneRef.current?.clearSelection()}
      />
    </div>
  )
}
