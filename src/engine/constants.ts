/** Earth's standard gravitational parameter (GM), km^3/s^2. */
export const EARTH_MU_KM3_S2 = 398600.4418

/** Earth's equatorial radius (WGS84), km. */
export const EARTH_RADIUS_KM = 6378.137

/** The Moon's standard gravitational parameter (GM), km^3/s^2. */
export const MOON_MU_KM3_S2 = 4902.8

/** The Moon's mean radius, km. */
export const MOON_RADIUS_KM = 1737.4

/** Mars's standard gravitational parameter (GM), km^3/s^2. */
export const MARS_MU_KM3_S2 = 42828.37

/** Mars's mean radius, km. */
export const MARS_RADIUS_KM = 3389.5

/** Mercury's standard gravitational parameter (GM), km^3/s^2. */
export const MERCURY_MU_KM3_S2 = 22032.09

/** Mercury's mean radius, km. */
export const MERCURY_RADIUS_KM = 2439.7

/** Venus's standard gravitational parameter (GM), km^3/s^2. */
export const VENUS_MU_KM3_S2 = 324858.63

/** Venus's mean radius, km. */
export const VENUS_RADIUS_KM = 6051.8

/** Jupiter's standard gravitational parameter (GM), km^3/s^2. */
export const JUPITER_MU_KM3_S2 = 126686531

/** Jupiter's volumetric mean radius, km - it has no solid surface, so "altitude" for orbit design is measured from this reference radius (the standard convention for gas giants). */
export const JUPITER_RADIUS_KM = 69911

/** Saturn's standard gravitational parameter (GM), km^3/s^2. */
export const SATURN_MU_KM3_S2 = 37931206

/** Saturn's volumetric mean radius, km - same "no solid surface" caveat as Jupiter's. */
export const SATURN_RADIUS_KM = 58232

/** Uranus's standard gravitational parameter (GM), km^3/s^2. */
export const URANUS_MU_KM3_S2 = 5793951

/** Uranus's volumetric mean radius, km - same "no solid surface" caveat as Jupiter's. */
export const URANUS_RADIUS_KM = 25362

/** Neptune's standard gravitational parameter (GM), km^3/s^2. */
export const NEPTUNE_MU_KM3_S2 = 6836529

/** Neptune's volumetric mean radius, km - same "no solid surface" caveat as Jupiter's. */
export const NEPTUNE_RADIUS_KM = 24622

/** Earth's J2 zonal harmonic coefficient (oblateness), dimensionless. Same value satellite.js uses for SGP4. */
export const EARTH_J2 = 0.001082616

/** Mean sidereal day, seconds. */
export const SIDEREAL_DAY_S = 86164.0905

export const TWO_PI = 2 * Math.PI

/** Earth's rotation rate about its axis, rad/s. */
export const EARTH_ROTATION_RATE_RAD_S = TWO_PI / SIDEREAL_DAY_S
