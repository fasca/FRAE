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
  CREATE INDEX IF NOT EXISTS idx_flights_callsign ON flights(callsign);
  CREATE INDEX IF NOT EXISTS idx_flights_icao24   ON flights(icao24);

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

export function getActiveIcao24s(begin: number, end: number): string[] {
  const rows = db.prepare(
    'SELECT DISTINCT icao24 FROM positions WHERE time >= ? AND time <= ?'
  ).all(begin, end) as { icao24: string }[]
  return rows.map(r => r.icao24)
}
