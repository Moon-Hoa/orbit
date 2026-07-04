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

## Credits

Earth daymap texture (`src/assets/earth-daymap.jpg`) by [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
