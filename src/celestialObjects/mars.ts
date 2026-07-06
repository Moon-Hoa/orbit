import type { OrbitalElements } from '../engine'
import { MARS_RADIUS_KM } from '../engine'
import type { Orbiter, SurfaceObjectCategory } from './types'

const degToRad = (deg: number) => (deg * Math.PI) / 180

/**
 * Successful landers and rovers. Coordinates (areographic lat/lon, east
 * positive) from each mission's official landing-site report.
 */
const LANDERS_AND_ROVERS: SurfaceObjectCategory['objects'] = [
  {
    id: 'viking-1',
    name: 'Viking 1',
    mission: 'Viking 1',
    agency: 'NASA',
    date: '1976-07-20',
    status: 'inactive',
    description: 'First successful Mars lander; operated for over 6 years in Chryse Planitia.',
    latitudeDeg: 22.48,
    longitudeDeg: -49.97,
  },
  {
    id: 'viking-2',
    name: 'Viking 2',
    mission: 'Viking 2',
    agency: 'NASA',
    date: '1976-09-03',
    status: 'inactive',
    description: 'Viking 1’s sister lander, in Utopia Planitia.',
    latitudeDeg: 48.27,
    longitudeDeg: 134.09,
  },
  {
    id: 'pathfinder',
    name: 'Mars Pathfinder (Sojourner)',
    mission: 'Mars Pathfinder',
    agency: 'NASA',
    date: '1997-07-04',
    status: 'inactive',
    description: 'First wheeled rover on Mars, in Ares Vallis.',
    latitudeDeg: 19.13,
    longitudeDeg: -33.22,
  },
  {
    id: 'spirit',
    name: 'Spirit (MER-A)',
    mission: 'Mars Exploration Rover',
    agency: 'NASA',
    date: '2004-01-04',
    status: 'inactive',
    description: 'Explored Gusev crater for over 6 years, well past its 90-day design life.',
    latitudeDeg: -14.57,
    longitudeDeg: 175.47,
  },
  {
    id: 'opportunity',
    name: 'Opportunity (MER-B)',
    mission: 'Mars Exploration Rover',
    agency: 'NASA',
    date: '2004-01-25',
    status: 'inactive',
    description: 'Operated for nearly 15 years in Meridiani Planum before a dust storm ended the mission.',
    latitudeDeg: -1.95,
    longitudeDeg: -5.53,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    mission: 'Phoenix',
    agency: 'NASA',
    date: '2008-05-25',
    status: 'inactive',
    description: 'Confirmed water ice near the Martian north pole.',
    latitudeDeg: 68.22,
    longitudeDeg: -125.75,
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    mission: 'Mars Science Laboratory',
    agency: 'NASA',
    date: '2012-08-06',
    status: 'active',
    description: 'Still exploring Gale crater and Mount Sharp.',
    latitudeDeg: -4.5895,
    longitudeDeg: 137.4417,
  },
  {
    id: 'insight',
    name: 'InSight',
    mission: 'InSight',
    agency: 'NASA',
    date: '2018-11-26',
    status: 'inactive',
    description: 'Recorded the first confirmed marsquakes, in Elysium Planitia.',
    latitudeDeg: 4.5024,
    longitudeDeg: 135.6234,
  },
  {
    id: 'perseverance',
    name: 'Perseverance & Ingenuity',
    mission: 'Mars 2020',
    agency: 'NASA',
    date: '2021-02-18',
    status: 'active',
    description: 'Sample-caching rover in Jezero crater; Ingenuity was the first powered flight on another world.',
    latitudeDeg: 18.4447,
    longitudeDeg: 77.4508,
  },
  {
    id: 'zhurong',
    name: 'Zhurong',
    mission: 'Tianwen-1',
    agency: 'CNSA',
    date: '2021-05-14',
    status: 'inactive',
    description: 'China’s first Mars rover, in Utopia Planitia.',
    latitudeDeg: 25.066,
    longitudeDeg: 109.925,
  },
]

/** Failed, crashed, or only-partially-successful landings. */
const FAILED_LANDINGS: SurfaceObjectCategory['objects'] = [
  {
    id: 'mars-polar-lander',
    name: 'Mars Polar Lander',
    mission: 'Mars Polar Lander',
    agency: 'NASA',
    date: '1999-12-03',
    status: 'inactive',
    description: 'Lost during descent; believed to have crashed near the south polar layered terrain.',
    latitudeDeg: -76,
    longitudeDeg: -165,
  },
  {
    id: 'schiaparelli',
    name: 'Schiaparelli EDM',
    mission: 'ExoMars 2016',
    agency: 'ESA / Roscosmos',
    date: '2016-10-19',
    status: 'inactive',
    description: 'Crashed after a premature parachute release and thruster shutdown.',
    latitudeDeg: -2.07,
    longitudeDeg: -6.21,
  },
  {
    id: 'beagle-2',
    name: 'Beagle 2',
    mission: 'Mars Express',
    agency: 'ESA / UK Space Agency',
    date: '2003-12-25',
    status: 'inactive',
    description: 'Landed intact in Isidis Planitia but failed to fully deploy its solar panels; found by MRO in 2015.',
    latitudeDeg: 11.53,
    longitudeDeg: 90.43,
  },
]

export const MARS_SURFACE_OBJECT_CATEGORIES: SurfaceObjectCategory[] = [
  {
    id: 'mars-landers',
    label: 'Landers & rovers',
    note: 'Successful NASA/CNSA surface missions (1976–present) — 10 sites',
    color: 0xfb923c,
    objects: LANDERS_AND_ROVERS,
  },
  {
    id: 'mars-failed',
    label: 'Failed or partial landings',
    note: 'Lost or incomplete landing attempts — 3 sites',
    color: 0xf87171,
    objects: FAILED_LANDINGS,
  },
]

const nearCircularElements = (
  semiMajorAxisKm: number,
  inclinationDeg: number,
  raanDeg: number,
): OrbitalElements => ({
  semiMajorAxisKm,
  eccentricity: 0.01,
  inclinationRad: degToRad(inclinationDeg),
  raanRad: degToRad(raanDeg),
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
})

const ellipticalElements = (
  semiMajorAxisKm: number,
  eccentricity: number,
  inclinationDeg: number,
  raanDeg: number,
): OrbitalElements => ({
  semiMajorAxisKm,
  eccentricity,
  inclinationRad: degToRad(inclinationDeg),
  raanRad: degToRad(raanDeg),
  argOfPerigeeRad: degToRad(270),
  trueAnomalyRad: 0,
})

/**
 * Active/notable Mars orbiters. Elements are approximate osculating values
 * from published mission parameters (see `Orbiter` doc comment), not a live
 * ephemeris.
 */
export const MARS_ORBITERS: Orbiter[] = [
  {
    id: 'mro',
    name: 'Mars Reconnaissance Orbiter',
    mission: 'MRO',
    agency: 'NASA',
    date: '2005-08-12',
    status: 'active',
    description: 'High-resolution mapping orbiter in a near-circular, near-polar sun-synchronous orbit.',
    elements: nearCircularElements(MARS_RADIUS_KM + 290, 92.65, 0),
  },
  {
    id: 'maven',
    name: 'MAVEN',
    mission: 'MAVEN',
    agency: 'NASA',
    date: '2013-11-18',
    status: 'active',
    description: 'Studies atmospheric loss from a highly elliptical orbit.',
    elements: ellipticalElements(6564.5, 0.4608, 75, 90),
  },
  {
    id: 'mars-express',
    name: 'Mars Express',
    mission: 'Mars Express',
    agency: 'ESA',
    date: '2003-12-25',
    status: 'active',
    description: 'ESA’s first Mars orbiter, still returning imagery and radar data from a polar orbit.',
    elements: ellipticalElements(8589.5, 0.5705, 86.3, 180),
  },
  {
    id: 'exomars-tgo',
    name: 'ExoMars Trace Gas Orbiter',
    mission: 'ExoMars TGO',
    agency: 'ESA / Roscosmos',
    date: '2016-03-14',
    status: 'active',
    description: 'Searches for atmospheric trace gases from a circular science orbit; also relays rover data.',
    elements: nearCircularElements(MARS_RADIUS_KM + 400, 74, 270),
  },
  {
    id: 'hope',
    name: 'Hope (Al-Amal)',
    mission: 'Emirates Mars Mission',
    agency: 'MBRSC (UAE)',
    date: '2020-07-19',
    status: 'active',
    description: 'Wide, high-altitude orbit designed for full-disk daily weather coverage.',
    elements: ellipticalElements(34889.5, 0.3296, 25, 45),
  },
]
