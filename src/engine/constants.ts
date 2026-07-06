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

/** Earth's J2 zonal harmonic coefficient (oblateness), dimensionless. Same value satellite.js uses for SGP4. */
export const EARTH_J2 = 0.001082616

/** Mean sidereal day, seconds. */
export const SIDEREAL_DAY_S = 86164.0905

export const TWO_PI = 2 * Math.PI

/** Earth's rotation rate about its axis, rad/s. */
export const EARTH_ROTATION_RATE_RAD_S = TWO_PI / SIDEREAL_DAY_S
