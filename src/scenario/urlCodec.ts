import { DEFAULT_CENTRAL_BODY_ID, isCentralBodyId, type OrbitalElements, type Vector3 } from '../engine'
import type { CameraState, Scenario } from './types'

const URL_NUMBER_PRECISION = 6

const radToDeg = (rad: number) => (rad * 180) / Math.PI
const degToRad = (deg: number) => (deg * Math.PI) / 180

function formatNumber(value: number): string {
  return Number(value.toFixed(URL_NUMBER_PRECISION)).toString()
}

function formatVector3(v: Vector3): string {
  return [v.x, v.y, v.z].map(formatNumber).join(',')
}

/** `params.get(key)` treats a missing/empty value as NaN rather than 0 (unlike bare `Number(null)`). */
function parseRequiredNumber(raw: string | null): number {
  if (raw === null || raw === '') return Number.NaN
  return Number(raw)
}

function parseVector3(raw: string | null): Vector3 | null {
  if (raw === null) return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  const [x, y, z] = parts
  return { x, y, z }
}

/** Encodes a scenario as query params (readable/debuggable, no separate decode library needed). */
export function encodeScenario(scenario: Scenario): URLSearchParams {
  const params = new URLSearchParams()
  params.set('mode', scenario.mode)
  params.set('speed', formatNumber(scenario.speedMultiplier))
  params.set('body', scenario.centralBody)

  if (scenario.mode === 'design') {
    const { elements } = scenario
    params.set('a', formatNumber(elements.semiMajorAxisKm))
    params.set('e', formatNumber(elements.eccentricity))
    params.set('i', formatNumber(radToDeg(elements.inclinationRad)))
    params.set('raan', formatNumber(radToDeg(elements.raanRad)))
    params.set('argp', formatNumber(radToDeg(elements.argOfPerigeeRad)))
    params.set('nu', formatNumber(radToDeg(elements.trueAnomalyRad)))
  } else {
    params.set('norad', scenario.noradId)
  }

  if (scenario.camera) {
    params.set('cam', formatVector3(scenario.camera.position))
    params.set('tgt', formatVector3(scenario.camera.target))
  }

  return params
}

/** Decodes query params back to a scenario. Returns null for anything missing/malformed. */
export function decodeScenario(params: URLSearchParams): Scenario | null {
  const mode = params.get('mode')
  if (mode !== 'design' && mode !== 'track-real') return null

  const speedMultiplier = parseRequiredNumber(params.get('speed'))
  if (Number.isNaN(speedMultiplier) || speedMultiplier <= 0) return null

  const rawBody = params.get('body')
  // Real-satellite tracking is Earth-only; an older shared URL (or a design
  // URL with no 'body' param yet) defaults to Earth either way.
  const centralBody =
    mode === 'track-real' ? DEFAULT_CENTRAL_BODY_ID : isCentralBodyId(rawBody) ? rawBody : DEFAULT_CENTRAL_BODY_ID

  let camera: CameraState | undefined
  const position = parseVector3(params.get('cam'))
  const target = parseVector3(params.get('tgt'))
  if (position && target) camera = { position, target }

  if (mode === 'track-real') {
    const noradId = params.get('norad')
    if (!noradId) return null
    return { mode, noradId, speedMultiplier, centralBody, camera }
  }

  const semiMajorAxisKm = parseRequiredNumber(params.get('a'))
  const eccentricity = parseRequiredNumber(params.get('e'))
  const inclinationDeg = parseRequiredNumber(params.get('i'))
  const raanDeg = parseRequiredNumber(params.get('raan'))
  const argOfPerigeeDeg = parseRequiredNumber(params.get('argp'))
  const trueAnomalyDeg = parseRequiredNumber(params.get('nu'))

  const numericFields = [
    semiMajorAxisKm,
    eccentricity,
    inclinationDeg,
    raanDeg,
    argOfPerigeeDeg,
    trueAnomalyDeg,
  ]
  if (numericFields.some(Number.isNaN)) return null

  const elements: OrbitalElements = {
    semiMajorAxisKm,
    eccentricity,
    inclinationRad: degToRad(inclinationDeg),
    raanRad: degToRad(raanDeg),
    argOfPerigeeRad: degToRad(argOfPerigeeDeg),
    trueAnomalyRad: degToRad(trueAnomalyDeg),
  }

  return { mode, elements, speedMultiplier, centralBody, camera }
}
