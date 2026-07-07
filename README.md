# Orbit

React + Vite + TypeScript + Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run test` — run the Vitest suite
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build locally

## Deployment

Every push to `main` runs the [deploy workflow](.github/workflows/deploy.yml), which builds the app and publishes it to GitHub Pages. Enable Pages once under the repo's **Settings → Pages** by setting the source to **GitHub Actions**.

## Real satellite data

"Track a real satellite" mode fetches TLEs directly from [Celestrak](https://celestrak.org/) client-side (it sends permissive CORS headers), cached in `localStorage` for ~2 hours to avoid re-fetching on every reload. There's no backend - this app is 100% static, deployed to GitHub Pages. If this ever moves behind a real edge function/cache (e.g. on a future AWS/GCP deploy), it's a drop-in swap: `src/satellite/celestrakProvider.ts` is the only place that knows about Celestrak's URL shape.

## Sharing scenarios

The whole scenario (design elements or tracked satellite, playback speed, camera position) lives in the URL's query params - there's no save/share backend. Continuous edits (slider drags) use `history.replaceState`; discrete actions (preset select, mode switch, satellite pick) use `history.pushState`, so the browser back button steps back through them like an undo stack. See `src/scenario/` for the encode/decode logic and the preset library (ISS, GEO, Molniya, Sun-synchronous, GPS).

## Ground station pins

Ground station pins (`src/groundStations/`) are grouped into independently-toggleable categories: ESA Estrack and a sample of NASA Near Earth Network and KSAT sites are hand-curated from each facility's public location; SatNOGS (community) is a bundled snapshot of the [SatNOGS Network](https://network.satnogs.org/)'s "Online" stations, fetched 2026-07-04 - its API has no CORS headers, so (per the "100% static, no backend" constraint above) it can't be queried live from the browser the way Celestrak's TLEs are. Re-generate `src/groundStations/satnogsSnapshot.ts` by fetching `https://network.satnogs.org/api/stations/?format=json` server-side.

## Central bodies

The 3D scene can be centered on Earth, the Moon, or Mars (`src/engine/centralBodies.ts` has the registry: gravitational parameter, radius, and which Earth-only features apply). The Kepler propagator in `src/engine` already takes an arbitrary `mu`, so switching bodies swaps the mesh and repoints the scene's km-to-scene-units scale (`src/three/constants.ts`) rather than requiring a different code path per body. Earth-only features - real-satellite tracking (Celestrak has no Moon/Mars catalog), ground track/ground stations, the Hohmann planner, and ephemeris export - are hidden while a non-Earth body is selected; see the Moon/Mars view issues for what's explicitly out of scope for v1 (e.g. ground track for the Moon, which would need a lunar rotation-rate constant analogous to `EARTH_ROTATION_RATE_RAD_S`).

## Solar system view

A separate, independent top-level view from the Earth/Moon/Mars body view above (`SolarSystemViewer`/`SolarSystemScene`) - a different spatial scale (heliocentric, AU-based) and a different data problem, not an extension of `OrbitScene`. Switched between via `ViewModeSelector`, rendered in both views; solar-system state (current sim date, playback) is not part of the shareable URL yet, unlike the body view's scenario.

Planet positions come from a low-precision analytical ephemeris (`src/engine/ephemeris.ts`): Keplerian elements plus linear secular rates per Julian century, valid ~1800-2050 AD to a few arcminutes, from Standish, JPL Solar System Dynamics, ["Keplerian Elements for Approximate Positions of the Major Planets"](https://ssd.jpl.nasa.gov/planets/approx_pos.html). This ignores planetary perturbations, the same two-body simplification the rest of this app's orbit engine makes - appropriate for a "basic" view, not mission-planning precision.

Interplanetary missions currently in transit (`src/solarSystem/missions.ts`) are hand-curated from real launch/arrival dates, but their in-flight paths are an idealized transfer (a spherical interpolation between the departure and arrival body's position at those dates - see `src/solarSystem/transit.ts`), not a real published trajectory: this app has no source of real spacecraft ephemeris, matching the "100% static, no backend" constraint noted throughout this doc. Every entry is real historical missions, so "now" typically shows nobody in transit (their cruise phases are all in the past) - use the date picker or "sync to now" to jump to one of their transit windows.

## Credits

Earth daymap, Moon, and Mars surface textures (`src/assets/earth-daymap.jpg`, `moon-surface.jpg`, `mars-surface.jpg`), and the Sun, Mercury, Venus, Jupiter, Saturn (plus its ring), Uranus, and Neptune textures (`sun.jpg`, `mercury-surface.jpg`, `venus-atmosphere.jpg`, `jupiter.jpg`, `saturn.jpg`, `saturn-ring.png`, `uranus.jpg`, `neptune.jpg`) by [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons ([Moon](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_moon.jpg), [Mars](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_mars.jpg), [Sun](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_sun.jpg), [Mercury](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_mercury.jpg), [Venus](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_venus_atmosphere.jpg), [Jupiter](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_jupiter.jpg), [Saturn](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_saturn.jpg), [Saturn's ring](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_saturn_ring_alpha.png), [Uranus](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_uranus.jpg), [Neptune](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_neptune.jpg)).
