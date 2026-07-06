import type { SpacecraftTransit } from './types'

/**
 * Real interplanetary missions' cruise phases (launch -> Mars orbit
 * insertion/landing), modeled as idealized transfers (see `types.ts`) - not
 * real published trajectories. All entries here are historical/completed;
 * since "in transit" is derived purely from comparing the current sim date
 * against each entry's departure/arrival dates (see `transit.ts`), viewing
 * "now" shows none of them in transit (their cruise phases are all in the
 * past) - scrub the timeline back to one of the dates below to see it.
 */
export const SPACECRAFT_TRANSITS: SpacecraftTransit[] = [
  {
    id: 'viking-1',
    name: 'Viking 1',
    agency: 'NASA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '1975-08-20',
    arrivalDate: '1976-07-20',
    isIdealizedTransfer: true,
    description: 'First successful Mars lander; touched down in Chryse Planitia.',
  },
  {
    id: 'mars-express',
    name: 'Mars Express',
    agency: 'ESA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '2003-06-02',
    arrivalDate: '2003-12-25',
    isIdealizedTransfer: true,
    description: "ESA's first Mars mission; still operating in orbit today.",
  },
  {
    id: 'msl-curiosity',
    name: 'Curiosity (MSL)',
    agency: 'NASA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '2011-11-26',
    arrivalDate: '2012-08-06',
    isIdealizedTransfer: true,
    description: 'Nuclear-powered rover delivered via the "sky crane" landing system.',
  },
  {
    id: 'maven',
    name: 'MAVEN',
    agency: 'NASA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '2013-11-18',
    arrivalDate: '2014-09-22',
    isIdealizedTransfer: true,
    description: "Orbiter studying Mars's upper atmosphere and its loss to space.",
  },
  {
    id: 'insight',
    name: 'InSight',
    agency: 'NASA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '2018-05-05',
    arrivalDate: '2018-11-26',
    isIdealizedTransfer: true,
    description: 'Lander that used a seismometer to study marsquakes.',
  },
  {
    id: 'mars-2020-perseverance',
    name: 'Perseverance (Mars 2020)',
    agency: 'NASA',
    departureBody: 'earth',
    arrivalBody: 'mars',
    departureDate: '2020-07-30',
    arrivalDate: '2021-02-18',
    isIdealizedTransfer: true,
    description: 'Rover that landed in Jezero Crater alongside the Ingenuity helicopter.',
  },
]
