import { describe, expect, it } from 'vitest'
import { orbitalPeriodSeconds } from '../engine'
import { CENTRAL_BODY_ORBITERS, CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES } from './index'

describe('CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES (see Moon/Mars surface catalog issues)', () => {
  it('has no categories for Earth - this layer is Moon/Mars only', () => {
    expect(CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES.earth).toEqual([])
  })

  for (const bodyId of ['moon', 'mars'] as const) {
    describe(bodyId, () => {
      const categories = CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES[bodyId]

      it('has at least one category with at least one object', () => {
        expect(categories.length).toBeGreaterThan(0)
        for (const category of categories) {
          expect(category.objects.length).toBeGreaterThan(0)
        }
      })

      it('has unique category ids', () => {
        const ids = categories.map((c) => c.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      const allObjects = categories.flatMap((c) => c.objects)

      it('has unique object ids and names across all categories', () => {
        const ids = allObjects.map((o) => o.id)
        expect(new Set(ids).size).toBe(ids.length)
        const names = allObjects.map((o) => o.name)
        expect(new Set(names).size).toBe(names.length)
      })

      it('has valid latitude/longitude ranges for every object', () => {
        for (const object of allObjects) {
          expect(object.latitudeDeg, object.id).toBeGreaterThanOrEqual(-90)
          expect(object.latitudeDeg, object.id).toBeLessThanOrEqual(90)
          expect(object.longitudeDeg, object.id).toBeGreaterThanOrEqual(-180)
          expect(object.longitudeDeg, object.id).toBeLessThanOrEqual(180)
        }
      })

      it('gives every object a non-empty name, mission, agency, and description', () => {
        for (const object of allObjects) {
          expect(object.name.length, object.id).toBeGreaterThan(0)
          expect(object.mission.length, object.id).toBeGreaterThan(0)
          expect(object.agency.length, object.id).toBeGreaterThan(0)
          expect(object.description.length, object.id).toBeGreaterThan(0)
        }
      })
    })
  }
})

describe('CENTRAL_BODY_ORBITERS (see Moon/Mars surface catalog issues)', () => {
  it('has no orbiters for Earth - this layer is Moon/Mars only', () => {
    expect(CENTRAL_BODY_ORBITERS.earth).toEqual([])
  })

  for (const bodyId of ['moon', 'mars'] as const) {
    describe(bodyId, () => {
      const orbiters = CENTRAL_BODY_ORBITERS[bodyId]

      it('has at least one orbiter', () => {
        expect(orbiters.length).toBeGreaterThan(0)
      })

      it('has unique ids and names', () => {
        const ids = orbiters.map((o) => o.id)
        expect(new Set(ids).size).toBe(ids.length)
        const names = orbiters.map((o) => o.name)
        expect(new Set(names).size).toBe(names.length)
      })

      it('has physically sane orbital elements (positive period, 0 <= e < 1)', () => {
        for (const orbiter of orbiters) {
          expect(orbiter.elements.eccentricity, orbiter.id).toBeGreaterThanOrEqual(0)
          expect(orbiter.elements.eccentricity, orbiter.id).toBeLessThan(1)
          expect(
            orbitalPeriodSeconds(orbiter.elements.semiMajorAxisKm),
            orbiter.id,
          ).toBeGreaterThan(0)
        }
      })
    })
  }
})
