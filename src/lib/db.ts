/**
 * SQLite database module — server-side only (API routes).
 * Uses better-sqlite3 (synchronous) for simplicity and speed.
 * Database file: data/frae.db (gitignored)
 *
 * Import ONLY from API routes or server-side code.
 * Never import in client components or hooks.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type { Position, FlightRecord, Route, TrackRecord } from '@/types/index'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'frae.db')

fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_PATH)

// Busy timeout: wait up to 5s instead of immediately throwing SQLITE_BUSY
// (needed during Next.js build when multiple workers open the DB concurrently)
db.pragma('busy_timeout = 5000')
// WAL mode: readers don't block writers — better for concurrent API route calls
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS positions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24        TEXT    NOT NULL,
    callsign      TEXT,
    time          INTEGER NOT NULL,
    lat           REAL    NOT NULL,
    lon           REAL    NOT NULL,
    altitude      REAL,
    heading       REAL,
    velocity      REAL,
    vertical_rate REAL,
    on_ground     INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_positions_icao24_time ON positions(icao24, time);
  CREATE INDEX IF NOT EXISTS idx_positions_callsign    ON positions(callsign);

  CREATE TABLE IF NOT EXISTS flights (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24         TEXT    NOT NULL,
    callsign       TEXT,
    first_seen     INTEGER,
    last_seen      INTEGER,
    departure_icao TEXT,
    arrival_icao   TEXT,
    fetched_at     INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_flights_callsign   ON flights(callsign);
  CREATE INDEX IF NOT EXISTS idx_flights_icao24     ON flights(icao24);
  CREATE INDEX IF NOT EXISTS idx_flights_time_range ON flights(last_seen, first_seen);

  CREATE TABLE IF NOT EXISTS tracks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24     TEXT    NOT NULL,
    callsign   TEXT,
    start_time INTEGER,
    end_time   INTEGER,
    path       TEXT    NOT NULL,
    fetched_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_tracks_icao24 ON tracks(icao24);

  CREATE TABLE IF NOT EXISTS routes (
    callsign       TEXT PRIMARY KEY,
    departure_icao TEXT,
    arrival_icao   TEXT,
    last_seen      INTEGER,
    flight_count   INTEGER DEFAULT 1
  );
`)

// ── Prepared statements ───────────────────────────────────────────────────────

const stmtInsertPosition = db.prepare(`
  INSERT INTO positions
    (icao24, callsign, time, lat, lon, altitude, heading, velocity, vertical_rate, on_ground)
  VALUES
    (@icao24, @callsign, @time, @lat, @lon, @altitude, @heading, @velocity, @vertical_rate, @on_ground)
`)

const stmtInsertFlight = db.prepare(`
  INSERT INTO flights (icao24, callsign, first_seen, last_seen, departure_icao, arrival_icao)
  VALUES (@icao24, @callsign, @first_seen, @last_seen, @departure_icao, @arrival_icao)
`)

const stmtInsertTrack = db.prepare(`
  INSERT INTO tracks (icao24, callsign, start_time, end_time, path)
  VALUES (@icao24, @callsign, @start_time, @end_time, @path)
`)

const stmtUpsertRoute = db.prepare(`
  INSERT INTO routes (callsign, departure_icao, arrival_icao, last_seen, flight_count)
  VALUES (@callsign, @departure_icao, @arrival_icao, @last_seen, 1)
  ON CONFLICT(callsign) DO UPDATE SET
    departure_icao = @departure_icao,
    arrival_icao   = @arrival_icao,
    last_seen      = @last_seen,
    flight_count   = flight_count + 1
`)

// Wrap bulk insert in a single transaction (10× faster than row-by-row)
const insertPositionsTx = db.transaction((rows: Position[]) => {
  for (const p of rows) {
    stmtInsertPosition.run({
      icao24:        p.icao24,
      callsign:      p.callsign ?? null,
      time:          p.time,
      lat:           p.lat,
      lon:           p.lon,
      altitude:      p.altitude ?? null,
      heading:       p.heading ?? null,
      velocity:      p.velocity ?? null,
      vertical_rate: p.vertical_rate ?? null,
      on_ground:     p.on_ground ? 1 : 0,
    })
  }
})

// ── Public API ────────────────────────────────────────────────────────────────

export function insertPositions(positions: Position[]): void {
  if (positions.length === 0) return
  insertPositionsTx(positions)
}

export function getPositionsByIcao24(icao24: string, since?: number): Position[] {
  if (since !== undefined) {
    return db.prepare(
      'SELECT * FROM positions WHERE icao24 = ? AND time >= ? ORDER BY time ASC'
    ).all(icao24, since) as Position[]
  }
  return db.prepare(
    'SELECT * FROM positions WHERE icao24 = ? ORDER BY time ASC'
  ).all(icao24) as Position[]
}

export function getPositionsByTimeRange(begin: number, end: number): Position[] {
  return db.prepare(
    'SELECT * FROM positions WHERE time >= ? AND time <= ? ORDER BY icao24, time ASC'
  ).all(begin, end) as Position[]
}

export function insertFlight(flight: FlightRecord): void {
  stmtInsertFlight.run({
    icao24:         flight.icao24,
    callsign:       flight.callsign ?? null,
    first_seen:     flight.first_seen ?? null,
    last_seen:      flight.last_seen ?? null,
    departure_icao: flight.departure_icao ?? null,
    arrival_icao:   flight.arrival_icao ?? null,
  })
}

export function getRouteByCallsign(callsign: string): Route | null {
  const row = db.prepare(
    'SELECT * FROM routes WHERE callsign = ?'
  ).get(callsign.trim().toUpperCase()) as Route | undefined
  return row ?? null
}

export function upsertRoute(
  callsign: string,
  departure: string | null,
  arrival: string | null,
  lastSeen: number
): void {
  stmtUpsertRoute.run({
    callsign:       callsign.trim().toUpperCase(),
    departure_icao: departure,
    arrival_icao:   arrival,
    last_seen:      lastSeen,
  })
}

export function insertTrack(
  icao24: string,
  callsign: string,
  startTime: number,
  endTime: number,
  pathJson: string
): void {
  stmtInsertTrack.run({
    icao24,
    callsign: callsign || null,
    start_time: startTime,
    end_time:   endTime,
    path:       pathJson,
  })
}

export function getTrackByIcao24(icao24: string): TrackRecord | null {
  const row = db.prepare(
    'SELECT * FROM tracks WHERE icao24 = ? ORDER BY fetched_at DESC LIMIT 1'
  ).get(icao24) as TrackRecord | undefined
  return row ?? null
}

/**
 * Returns all flight records that overlap with the given day.
 * A flight overlaps if it started before dayEnd and ended after dayStart.
 */
export function getFlightsByDay(dayStart: number, dayEnd: number): FlightRecord[] {
  return db.prepare(
    `SELECT * FROM flights
     WHERE last_seen >= ? AND first_seen <= ?
     ORDER BY first_seen ASC`
  ).all(dayStart, dayEnd) as FlightRecord[]
}

export function getActiveIcao24s(begin: number, end: number): string[] {
  const rows = db.prepare(
    'SELECT DISTINCT icao24 FROM positions WHERE time >= ? AND time <= ?'
  ).all(begin, end) as { icao24: string }[]
  return rows.map(r => r.icao24)
}

// ── Routes corridor aggregation ───────────────────────────────────────────

interface CorridorRow {
  departure_icao: string
  arrival_icao: string
  total_flights: number
  callsigns: string | null
}

/**
 * Aggregate the routes table by (departure_icao, arrival_icao) pair.
 * Returns corridors ordered by total flight count descending.
 */
export function getAggregatedCorridors(
  minFlightCount: number,
  limit: number
): CorridorRow[] {
  return db.prepare(`
    SELECT
      departure_icao,
      arrival_icao,
      SUM(flight_count) AS total_flights,
      GROUP_CONCAT(callsign, ',') AS callsigns
    FROM routes
    WHERE departure_icao IS NOT NULL
      AND arrival_icao IS NOT NULL
      AND departure_icao != arrival_icao
    GROUP BY departure_icao, arrival_icao
    HAVING total_flights >= ?
    ORDER BY total_flights DESC
    LIMIT ?
  `).all(minFlightCount, limit) as CorridorRow[]
}

/**
 * Fetch up to `limit` [lon, lat] pairs for a given callsign from the positions table.
 * Used to attach sample trajectories to corridors.
 */
export function getSamplePositionsForCallsign(
  callsign: string,
  limit: number
): [number, number][] {
  const rows = db.prepare(
    'SELECT lon, lat FROM positions WHERE callsign = ? ORDER BY time ASC LIMIT ?'
  ).all(callsign.trim().toUpperCase(), limit) as { lon: number; lat: number }[]
  return rows.map(r => [r.lon, r.lat])
}

// ── Maintenance / retention ────────────────────────────────────────────────

export const POSITIONS_RETENTION_DAYS = 7
export const FLIGHTS_RETENTION_DAYS   = 30
export const ROUTES_RETENTION_DAYS    = 30
export const TRACKS_RETENTION_DAYS    = 7

/** Purge positions older than maxAgeSec (default: 7 days). Returns deleted count. */
export function purgeOldPositions(maxAgeSec = POSITIONS_RETENTION_DAYS * 86400): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
  const result = db.prepare('DELETE FROM positions WHERE time < ?').run(cutoff)
  return result.changes
}

/** Purge flights older than maxAgeSec (default: 30 days). Returns deleted count. */
export function purgeOldFlights(maxAgeSec = FLIGHTS_RETENTION_DAYS * 86400): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
  const result = db.prepare('DELETE FROM flights WHERE fetched_at < ?').run(cutoff)
  return result.changes
}

/** Purge tracks fetched before maxAgeSec ago (default: 7 days). Returns deleted count. */
export function purgeOldTracks(maxAgeSec = TRACKS_RETENTION_DAYS * 86400): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
  const result = db.prepare('DELETE FROM tracks WHERE fetched_at < ?').run(cutoff)
  return result.changes
}

/** Purge routes not seen in maxAgeSec (default: 30 days). Returns deleted count. */
export function purgeStaleRoutes(maxAgeSec = ROUTES_RETENTION_DAYS * 86400): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
  const result = db.prepare('DELETE FROM routes WHERE last_seen < ?').run(cutoff)
  return result.changes
}

/** Run all purges then VACUUM. Returns per-table deleted counts. */
export function runMaintenance(): {
  positions: number
  flights: number
  tracks: number
  routes: number
} {
  const positions = purgeOldPositions()
  const flights   = purgeOldFlights()
  const tracks    = purgeOldTracks()
  const routes    = purgeStaleRoutes()
  db.exec('VACUUM')
  return { positions, flights, tracks, routes }
}
