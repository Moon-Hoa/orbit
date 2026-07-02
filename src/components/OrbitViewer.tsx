import { useEffect, useRef } from 'react'
import { OrbitScene } from '../three/OrbitScene'
import { ISS_LIKE_ELEMENTS } from '../three/sampleOrbits'

/**
 * Thin React boundary around the Three.js scene: mounts/unmounts an
 * OrbitScene instance and otherwise stays out of the render loop's way.
 */
export function OrbitViewer() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new OrbitScene(container, ISS_LIKE_ELEMENTS)
    scene.start()

    return () => scene.dispose()
  }, [])

  return <div ref={containerRef} className="h-screen w-screen" />
}
