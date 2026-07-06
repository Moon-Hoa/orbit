import { useState } from 'react'
import { OrbitViewer } from './components/OrbitViewer'
import { SolarSystemViewer } from './components/SolarSystemViewer'
import type { ViewMode } from './components/ViewModeSelector'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('body')

  return viewMode === 'solar-system' ? (
    <SolarSystemViewer onViewModeChange={setViewMode} />
  ) : (
    <OrbitViewer onViewModeChange={setViewMode} />
  )
}

export default App
