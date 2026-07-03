import { describe, expect, it } from 'vitest'
import { formatDistanceKm, formatSpeedKmS, kmPerSecToMph, kmToMiles } from './distanceUnits'

describe('kmToMiles', () => {
  it('converts a known distance', () => {
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 5)
    expect(kmToMiles(100)).toBeCloseTo(62.1371, 3)
  })
})

describe('kmPerSecToMph', () => {
  it('converts a known speed', () => {
    expect(kmPerSecToMph(1)).toBeCloseTo(2236.936, 2)
  })
})

describe('formatDistanceKm', () => {
  it('formats metric as km', () => {
    expect(formatDistanceKm(408, 'metric')).toBe('408.0 km')
  })

  it('formats imperial as miles', () => {
    expect(formatDistanceKm(408, 'imperial')).toBe('253.5 mi')
  })
})

describe('formatSpeedKmS', () => {
  it('formats metric as km/s', () => {
    expect(formatSpeedKmS(7.6612, 'metric')).toBe('7.66 km/s')
  })

  it('formats imperial as mph', () => {
    expect(formatSpeedKmS(7.6612, 'imperial')).toBe('17138 mph')
  })
})
