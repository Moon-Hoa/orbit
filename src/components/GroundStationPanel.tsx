import { useEffect, useMemo, useState } from 'react'
import { type SatellitePass, type TleRecord, findNextPasses } from '../satellite'
import { degToRad, radToDeg } from './angleUnits'

const STORAGE_KEY = 'orbit:observer-location'

interface StoredLocation {
  latitudeDeg: string
  longitudeDeg: string
  altitudeM: string
}

function loadStoredLocation(): StoredLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { latitudeDeg: '', longitudeDeg: '', altitudeM: '0' }
    return { latitudeDeg: '', longitudeDeg: '', altitudeM: '0', ...JSON.parse(raw) }
  } catch {
    return { latitudeDeg: '', longitudeDeg: '', altitudeM: '0' }
  }
}

function formatPassTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(pass: SatellitePass): string {
  const minutes = Math.round((pass.los.getTime() - pass.aos.getTime()) / 60000)
  return `${minutes} min`
}

type GeolocationStatus = 'idle' | 'loading' | 'denied' | 'unavailable'

interface GroundStationPanelProps {
  tle: TleRecord
  /**
   * Set (with a fresh `nonce`) to override the observer location - e.g. from
   * clicking a ground station pin. `nonce` must change even if the
   * coordinates don't, so re-selecting the same station still re-applies it.
   */
  presetLocation?: { latitudeDeg: number; longitudeDeg: number; nonce: number } | null
}

/** Next-pass (AOS/LOS/max elevation) predictions for a ground observer, track-real mode only. */
export function GroundStationPanel({ tle, presetLocation }: GroundStationPanelProps) {
  const [location, setLocation] = useState(loadStoredLocation)
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>('idle')
  const [passes, setPasses] = useState<SatellitePass[] | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!presetLocation) return
    setLocation({
      latitudeDeg: presetLocation.latitudeDeg.toFixed(4),
      longitudeDeg: presetLocation.longitudeDeg.toFixed(4),
      altitudeM: '0',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetLocation?.nonce])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
  }, [location])

  const observer = useMemo(() => {
    // `Number('')` is 0 (a valid in-range coordinate), not NaN - so an empty
    // field must be rejected explicitly rather than relying on range checks.
    if (location.latitudeDeg.trim() === '' || location.longitudeDeg.trim() === '') return null

    const latitudeDeg = Number(location.latitudeDeg)
    const longitudeDeg = Number(location.longitudeDeg)
    const altitudeM = Number(location.altitudeM)
    if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) return null
    if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) return null

    return {
      latitudeRad: degToRad(latitudeDeg),
      longitudeRad: degToRad(longitudeDeg),
      altitudeKm: (Number.isFinite(altitudeM) ? altitudeM : 0) / 1000,
    }
  }, [location])

  useEffect(() => {
    if (!observer) {
      setPasses(null)
      setError(null)
      return
    }

    setIsCalculating(true)
    setError(null)
    try {
      setPasses(findNextPasses(tle, observer, new Date()))
    } catch {
      setError('Could not compute passes for this satellite/location.')
      setPasses(null)
    } finally {
      setIsCalculating(false)
    }
  }, [tle, observer])

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeolocationStatus('unavailable')
      return
    }
    setGeolocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitudeDeg: position.coords.latitude.toFixed(4),
          longitudeDeg: position.coords.longitude.toFixed(4),
          altitudeM:
            position.coords.altitude !== null
              ? Math.max(0, position.coords.altitude).toFixed(0)
              : '0',
        })
        setGeolocationStatus('idle')
      },
      () => setGeolocationStatus('denied'),
    )
  }

  return (
    <div className="absolute right-4 bottom-4 flex w-72 flex-col gap-2 rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur">
      <h2 className="text-sm font-semibold text-slate-100">Ground station passes</h2>

      <div className="flex items-center gap-2">
        <input
          type="number"
          aria-label="Observer latitude"
          placeholder="Latitude"
          min={-90}
          max={90}
          value={location.latitudeDeg}
          onChange={(event) => {
            const latitudeDeg = event.target.value
            setLocation((prev) => ({ ...prev, latitudeDeg }))
          }}
          className="w-0 flex-1 rounded bg-slate-800 px-2 py-1 text-slate-100"
        />
        <input
          type="number"
          aria-label="Observer longitude"
          placeholder="Longitude"
          min={-180}
          max={180}
          value={location.longitudeDeg}
          onChange={(event) => {
            const longitudeDeg = event.target.value
            setLocation((prev) => ({ ...prev, longitudeDeg }))
          }}
          className="w-0 flex-1 rounded bg-slate-800 px-2 py-1 text-slate-100"
        />
      </div>

      <button
        type="button"
        onClick={handleUseMyLocation}
        className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
      >
        {geolocationStatus === 'loading' ? 'Locating…' : 'Use my location'}
      </button>
      {geolocationStatus === 'denied' && (
        <p className="text-red-400">Location permission denied - enter coordinates manually.</p>
      )}
      {geolocationStatus === 'unavailable' && (
        <p className="text-red-400">Geolocation isn't available - enter coordinates manually.</p>
      )}

      {!observer && (
        <p className="text-slate-400">Enter a latitude and longitude to see upcoming passes.</p>
      )}
      {error && <p className="text-red-400">{error}</p>}
      {observer && isCalculating && <p className="text-slate-400">Calculating…</p>}
      {observer && !isCalculating && passes && passes.length === 0 && (
        <p className="text-slate-400">No passes found in the next few days from this location.</p>
      )}

      {observer && !isCalculating && passes && passes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {passes.map((pass) => (
            <li
              key={pass.aos.getTime()}
              className="flex justify-between gap-2 rounded bg-slate-800/60 px-2 py-1"
            >
              <span className="text-slate-100">{formatPassTime(pass.aos)}</span>
              <span className="text-slate-400">{formatDuration(pass)}</span>
              <span className="font-mono text-sky-400">
                {radToDeg(pass.maxElevationRad).toFixed(0)}°
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
