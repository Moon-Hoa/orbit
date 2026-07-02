import { useEffect, useMemo, useRef, useState } from 'react'
import { orbitalPeriodSeconds } from '../engine'
import { OrbitScene } from '../three/OrbitScene'
import { ISS_LIKE_ELEMENTS } from '../three/sampleOrbits'
import { ElementPanel } from './ElementPanel'
import { formatElapsed } from './formatElapsed'
import { ModeToggle, type ViewerMode } from './ModeToggle'
import { PlaybackControls } from './PlaybackControls'

/**
 * Thin React boundary around the Three.js scene: owns UI state (elements,
 * playback) and pushes it into the OrbitScene instance imperatively, rather
 * than letting React re-render drive the render loop.
 */
export function OrbitViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OrbitScene | null>(null)
  const scrubRef = useRef<HTMLInputElement>(null)
  const timeReadoutRef = useRef<HTMLSpanElement>(null)

  const [elements, setElements] = useState(ISS_LIKE_ELEMENTS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(60)
  const [mode, setMode] = useState<ViewerMode>('design')

  const periodSeconds = useMemo(
    () => orbitalPeriodSeconds(elements.semiMajorAxisKm),
    [elements.semiMajorAxisKm],
  )

  // Mount once: create the scene and start its render loop. Later element/
  // playback changes are pushed via the effects below, not by remounting.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new OrbitScene(container, {
      initialElements: elements,
      onTick: (simTimeSeconds) => {
        if (scrubRef.current) scrubRef.current.value = String(simTimeSeconds)
        if (timeReadoutRef.current) {
          timeReadoutRef.current.textContent = formatElapsed(simTimeSeconds)
        }
      },
    })
    sceneRef.current = scene
    scene.start()

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setElements(elements)
  }, [elements])

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

      <ElementPanel elements={elements} onChange={setElements} />
      <ModeToggle mode={mode} onChange={setMode} />
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
