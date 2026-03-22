/**
 * TypeScript interfaces for AE Flight Radar (FRAE)
 * Foundation types for flights, projection, and map configuration
 */

/**
 * Flight data interface - represents a single aircraft in the system
 * Aligns with OpenSky Network API response structure
 */
export interface Flight {
  icao24: string
  callsign: string
  originCountry: string
  longitude: number
  latitude: number
  altitude: number
  velocity: number
  heading: number
  verticalRate: number
  onGround: boolean
  lastUpdate: number
}

/**
 * Projection center configuration
 * Defines the center point of the azimuthal equidistant projection
 */
export interface ProjectionCenter {
  lat: number
  lon: number
  label: string
}

/**
 * Airport data interface - represents a major airport in the database
 * icao is the 4-letter ICAO code (e.g. LFPG for CDG), distinct from IATA code (code field)
 */
export interface Airport {
  code: string   // IATA code (3 letters, e.g. CDG)
  icao: string   // ICAO code (4 letters, e.g. LFPG) — used for route lookup
  name: string
  lat: number
  lon: number
}

/**
 * Map rendering options
 * Controls which map layers and features are displayed
 */
export interface MapOptions {
  showAirports: boolean
  showGraticule: boolean
  showCountryBorders: boolean
}

/**
 * Stores current + previous position for interpolation between OpenSky fetches.
 * Used in a Map<string, FlightState> ref in useOpenSkyData.
 */
export interface FlightState {
  current: Flight
  previous: Flight | null
  lastFetchTime: number
}

/** Indicates the current data source displayed to the user */
export type DataSource = 'live' | 'replay' | 'routes'

/**
 * An aggregated corridor between two airports, built from the routes table.
 * Used by the Routes mode to display intercontinental air corridors.
 */
export interface RouteCorridor {
  departureIcao: string
  arrivalIcao: string
  departureAirport: Airport | null    // resolved via getAirportByIcao
  arrivalAirport: Airport | null
  flightCount: number                 // total flights on this corridor
  callsigns: string[]                 // sample callsigns (max 5) for display
  sampleTracks: [number, number][][]  // max 3 real trajectories [lon,lat][]
}

/** A raw position record stored in the SQLite positions table */
export interface Position {
  icao24: string
  callsign?: string | null
  time: number
  lat: number
  lon: number
  altitude?: number | null
  heading?: number | null
  velocity?: number | null
  vertical_rate?: number | null
  on_ground?: boolean
}

/** A completed flight record from OpenSky /flights/all */
export interface FlightRecord {
  icao24: string
  callsign?: string | null
  first_seen?: number | null
  last_seen?: number | null
  departure_icao?: string | null
  arrival_icao?: string | null
}

/** A route record derived from historical flights */
export interface Route {
  callsign: string
  departure_icao: string | null
  arrival_icao: string | null
  last_seen: number
  flight_count: number
}

/**
 * A completed flight with full trajectory for replay mode.
 * Combines data from the flights table, positions table, and airport DB.
 */
export interface CompletedFlight {
  icao24: string
  callsign: string
  firstSeen: number
  lastSeen: number
  departureIcao: string | null
  arrivalIcao: string | null
  departureAirport: Airport | null   // resolved via getAirportByIcao
  arrivalAirport: Airport | null
  positions: [number, number][]      // [lon, lat][] from positions table
  lastHeading: number                // heading at last recorded position
}

/** A full track record stored from OpenSky /tracks/all */
export interface TrackRecord {
  id: number
  icao24: string
  callsign: string | null
  start_time: number | null
  end_time: number | null
  path: string  // JSON array of [time, lat, lon, alt, heading, on_ground]
  fetched_at: number
}
