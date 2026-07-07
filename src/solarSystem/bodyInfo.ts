import type { MoonId, OtherBodyId, PlanetId } from '../engine'

/**
 * A short, glanceable fact per planet for the solar system view's
 * click-to-inspect tooltip - one sentence, the same terse tone as
 * `missions.ts`'s `description` field, not a full encyclopedia entry.
 */
export const PLANET_INFO: Record<PlanetId, string> = {
  mercury: 'The smallest planet and closest to the Sun, with the most extreme day-to-night temperature swings in the solar system.',
  venus: "The hottest planet by far, thanks to a runaway greenhouse effect - hotter than Mercury despite being farther from the Sun.",
  earth: 'The only known planet with life, and the only one with liquid water covering most of its surface.',
  mars: 'Colored by iron oxide (rust) dust; home to Olympus Mons, the tallest volcano in the solar system.',
  jupiter: "The largest planet by far - its Great Red Spot storm has raged for centuries and is bigger than Earth.",
  saturn: 'Famous for its spectacular rings, made mostly of countless ice particles ranging from dust-sized to house-sized.',
  uranus: 'An ice giant that rotates almost on its side, likely the result of an ancient collision.',
  neptune: 'The windiest planet, with the fastest sustained winds ever measured in the solar system.',
}

export const MOON_INFO: Record<MoonId, string> = {
  moon: "Earth's only natural satellite, and the main reason Earth has ocean tides.",
  phobos: "Mars' larger, closer moon - it orbits so fast it rises in the west and sets in the east twice a Martian day.",
  deimos: "Mars' smaller, outer moon, likely a captured asteroid.",
  io: "The most volcanically active body in the solar system, driven by tidal heating from Jupiter's gravity.",
  europa: "Jupiter's icy moon, thought to hide a liquid water ocean beneath its surface.",
  ganymede: 'The largest moon in the solar system - bigger than the planet Mercury.',
  callisto: "One of the most heavily cratered bodies known, a sign of an ancient, unchanged surface.",
  titan: "Saturn's largest moon, and the only moon with a dense atmosphere and stable liquid on its surface.",
}

export const OTHER_BODY_INFO: Record<OtherBodyId, string> = {
  pluto: 'Once the ninth planet; reclassified as a dwarf planet in 2006 after similar-sized bodies were found nearby.',
  ceres: 'The largest object in the asteroid belt, and the only dwarf planet in the inner solar system.',
  eris: "A dwarf planet slightly smaller than Pluto but more massive - its discovery helped trigger Pluto's reclassification.",
  halley: 'The most famous comet, visible from Earth roughly every 76 years - last seen in 1986, due back in 2061.',
}
