import { SATNOGS_STATIONS } from './satnogsSnapshot'
import type { GroundStationCategory } from './types'

/**
 * ESA's core Estrack deep-space/near-Earth tracking network (six stations in
 * six countries). Coordinates from each station's Wikipedia article.
 */
const ESTRACK_STATIONS = [
  { id: 'estrack-kourou', name: 'Kourou', latitudeDeg: 5.2514389, longitudeDeg: -52.8046639 },
  { id: 'estrack-santa-maria', name: 'Santa Maria', latitudeDeg: 36.9917, longitudeDeg: -25.1357 },
  { id: 'estrack-kiruna', name: 'Kiruna (Salmijärvi)', latitudeDeg: 67.8489, longitudeDeg: 20.3028 },
  { id: 'estrack-new-norcia', name: 'New Norcia', latitudeDeg: -31.0482, longitudeDeg: 116.191 },
  { id: 'estrack-cebreros', name: 'Cebreros', latitudeDeg: 40.4528, longitudeDeg: -4.3676 },
  { id: 'estrack-malargue', name: 'Malargüe', latitudeDeg: -35.776, longitudeDeg: -69.3982 },
]

/**
 * A sample of NASA's Near Earth Network sites, spanning both US coasts,
 * a polar site, and Antarctica. Coordinates from each site's Wikipedia
 * article (facility-level, not necessarily the exact antenna position).
 */
const NEN_STATIONS = [
  { id: 'nen-wallops', name: 'Wallops Island', latitudeDeg: 37.9333, longitudeDeg: -75.4678 },
  { id: 'nen-white-sands', name: 'White Sands', latitudeDeg: 32.507, longitudeDeg: -106.611 },
  { id: 'nen-fairbanks', name: 'Fairbanks (Alaska Satellite Facility)', latitudeDeg: 64.8436, longitudeDeg: -147.7231 },
  { id: 'nen-mcmurdo', name: 'McMurdo', latitudeDeg: -77.8463, longitudeDeg: 166.6682 },
]

/**
 * A sample of KSAT (Kongsberg Satellite Services) sites, including its two
 * flagship polar stations. Coordinates from each site's Wikipedia article.
 */
const KSAT_STATIONS = [
  { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
  { id: 'ksat-tromso', name: 'Tromsø', latitudeDeg: 69.6517, longitudeDeg: 18.9556 },
  { id: 'ksat-troll', name: 'TrollSat', latitudeDeg: -72.0167, longitudeDeg: 2.5333 },
  { id: 'ksat-punta-arenas', name: 'Punta Arenas', latitudeDeg: -53.167, longitudeDeg: -70.933 },
]

/** All ground station categories, each independently toggleable in the UI. */
export const GROUND_STATION_CATEGORIES: GroundStationCategory[] = [
  {
    id: 'estrack',
    label: 'ESA Estrack',
    sourceNote: 'Core deep-space/near-Earth network - 6 stations',
    color: 0x22d3ee,
    stations: ESTRACK_STATIONS,
  },
  {
    id: 'nen',
    label: 'NASA Near Earth Network',
    sourceNote: 'Sample of major sites - 4 stations',
    color: 0xf87171,
    stations: NEN_STATIONS,
  },
  {
    id: 'ksat',
    label: 'KSAT',
    sourceNote: 'Sample of major sites - 4 stations',
    color: 0xa78bfa,
    stations: KSAT_STATIONS,
  },
  {
    id: 'satnogs',
    label: 'SatNOGS (community)',
    sourceNote: `Bundled snapshot of online stations - ${SATNOGS_STATIONS.length} stations`,
    color: 0xa3e635,
    stations: SATNOGS_STATIONS,
  },
]
