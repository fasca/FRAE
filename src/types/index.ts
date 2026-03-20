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
 */
export interface Airport {
  code: string
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
  showFlightPaths: boolean
}
