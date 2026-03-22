/**
 * Tests for db.ts maintenance functions.
 * Uses an in-memory SQLite database — no file I/O, no cleanup required.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory DB fixture ──────────────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  `CREATE TABLE positions (
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
  )`,
  `CREATE TABLE flights (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24     TEXT    NOT NULL,
    callsign   TEXT,
    first_seen INTEGER,
    last_seen  INTEGER,
    departure_icao TEXT,
    arrival_icao   TEXT,
    fetched_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE tracks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24     TEXT    NOT NULL,
    callsign   TEXT,
    start_time INTEGER,
    end_time   INTEGER,
    path       TEXT    NOT NULL,
    fetched_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE routes (
    callsign       TEXT PRIMARY KEY,
    departure_icao TEXT,
    arrival_icao   TEXT,
    last_seen      INTEGER,
    flight_count   INTEGER DEFAULT 1
  )`,
]

function createTestDb() {
  const db = new Database(':memory:')
  for (const stmt of SCHEMA_STATEMENTS) {
    db.prepare(stmt).run()
  }
  return db
}

// Mirrors the purge logic in src/lib/db.ts so tests stay decoupled from the
// singleton DB module (which opens data/frae.db at import time).
function makePurges(db: ReturnType<typeof createTestDb>) {
  function purgeOldPositions(maxAgeSec = 7 * 86400) {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
    return db.prepare('DELETE FROM positions WHERE time < ?').run(cutoff).changes
  }
  function purgeOldFlights(maxAgeSec = 30 * 86400) {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
    return db.prepare('DELETE FROM flights WHERE fetched_at < ?').run(cutoff).changes
  }
  function purgeOldTracks(maxAgeSec = 7 * 86400) {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
    return db.prepare('DELETE FROM tracks WHERE fetched_at < ?').run(cutoff).changes
  }
  function purgeStaleRoutes(maxAgeSec = 30 * 86400) {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSec
    return db.prepare('DELETE FROM routes WHERE last_seen < ?').run(cutoff).changes
  }
  function runMaintenance() {
    const positions = purgeOldPositions()
    const flights   = purgeOldFlights()
    const tracks    = purgeOldTracks()
    const routes    = purgeStaleRoutes()
    return { positions, flights, tracks, routes }
  }
  return { purgeOldPositions, purgeOldFlights, purgeOldTracks, purgeStaleRoutes, runMaintenance }
}

const now = Math.floor(Date.now() / 1000)
const OLD_WEEK  = now - 10 * 86400  // 10 days ago — beyond 7-day window (positions, tracks)
const OLD_MONTH = now - 35 * 86400  // 35 days ago — beyond 30-day window (flights, routes)
const RECENT    = now - 1 * 86400   // 1 day ago — within all retention windows

// ── purgeOldPositions ─────────────────────────────────────────────────────────

describe('purgeOldPositions', () => {
  let db: ReturnType<typeof createTestDb>
  let purges: ReturnType<typeof makePurges>

  beforeEach(() => {
    db = createTestDb()
    purges = makePurges(db)
  })

  it('should_delete_positions_older_than_retention_window', () => {
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('abc', OLD_WEEK)
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('def', OLD_WEEK)

    const deleted = purges.purgeOldPositions()

    expect(deleted).toBe(2)
    const remaining = db.prepare('SELECT COUNT(*) AS n FROM positions').get() as { n: number }
    expect(remaining.n).toBe(0)
  })

  it('should_keep_recent_positions', () => {
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('abc', RECENT)

    const deleted = purges.purgeOldPositions()

    expect(deleted).toBe(0)
    const remaining = db.prepare('SELECT COUNT(*) AS n FROM positions').get() as { n: number }
    expect(remaining.n).toBe(1)
  })

  it('should_delete_old_but_keep_recent_in_mixed_batch', () => {
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('old', OLD_WEEK)
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('new', RECENT)

    const deleted = purges.purgeOldPositions()

    expect(deleted).toBe(1)
    const surviving = db.prepare('SELECT icao24 FROM positions').all() as { icao24: string }[]
    expect(surviving[0].icao24).toBe('new')
  })
})

// ── purgeStaleRoutes ──────────────────────────────────────────────────────────

describe('purgeStaleRoutes', () => {
  let db: ReturnType<typeof createTestDb>
  let purges: ReturnType<typeof makePurges>

  beforeEach(() => {
    db = createTestDb()
    purges = makePurges(db)
  })

  it('should_delete_routes_not_seen_in_retention_window', () => {
    db.prepare(
      'INSERT INTO routes (callsign, departure_icao, arrival_icao, last_seen) VALUES (?, ?, ?, ?)'
    ).run('UAL123', 'KLAX', 'KJFK', OLD_MONTH)

    const deleted = purges.purgeStaleRoutes()

    expect(deleted).toBe(1)
  })

  it('should_keep_recently_seen_routes', () => {
    db.prepare(
      'INSERT INTO routes (callsign, departure_icao, arrival_icao, last_seen) VALUES (?, ?, ?, ?)'
    ).run('BAW456', 'EGLL', 'LFPG', RECENT)

    const deleted = purges.purgeStaleRoutes()

    expect(deleted).toBe(0)
  })
})

// ── runMaintenance ────────────────────────────────────────────────────────────

describe('runMaintenance', () => {
  let db: ReturnType<typeof createTestDb>
  let purges: ReturnType<typeof makePurges>

  beforeEach(() => {
    db = createTestDb()
    purges = makePurges(db)
  })

  it('should_return_correct_counts_for_all_tables', () => {
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('aaa', OLD_WEEK)
    db.prepare(
      'INSERT INTO flights (icao24, callsign, fetched_at) VALUES (?, ?, ?)'
    ).run('bbb', 'TST001', OLD_MONTH)
    db.prepare(
      'INSERT INTO tracks (icao24, path, fetched_at) VALUES (?, ?, ?)'
    ).run('ccc', '[]', OLD_WEEK)
    db.prepare(
      'INSERT INTO routes (callsign, last_seen) VALUES (?, ?)'
    ).run('TST002', OLD_MONTH)

    const stats = purges.runMaintenance()

    expect(stats.positions).toBe(1)
    expect(stats.flights).toBe(1)
    expect(stats.tracks).toBe(1)
    expect(stats.routes).toBe(1)
  })

  it('should_return_zero_counts_when_nothing_to_purge', () => {
    db.prepare('INSERT INTO positions (icao24, time, lat, lon) VALUES (?, ?, 0, 0)').run('aaa', RECENT)

    const stats = purges.runMaintenance()

    expect(stats.positions).toBe(0)
    expect(stats.flights).toBe(0)
    expect(stats.tracks).toBe(0)
    expect(stats.routes).toBe(0)
  })
})

// ── log-positions altitude filter ─────────────────────────────────────────────

describe('log-positions altitude filter logic', () => {
  type PositionLike = { altitude: number | null; velocity: number | null }

  // Replicates the filter from log-positions/route.ts — tested independently
  // so we don't need to spin up a Next.js server.
  function filterMeaningful(positions: PositionLike[]): PositionLike[] {
    return positions.filter(p =>
      (p.altitude != null && p.altitude > 5000) ||
      (p.velocity != null && p.velocity > 100)
    )
  }

  it('should_reject_ground_position', () => {
    expect(filterMeaningful([{ altitude: 0, velocity: 0 }])).toHaveLength(0)
  })

  it('should_reject_low_altitude_slow_position', () => {
    expect(filterMeaningful([{ altitude: 1000, velocity: 50 }])).toHaveLength(0)
  })

  it('should_accept_high_altitude_position', () => {
    expect(filterMeaningful([{ altitude: 10000, velocity: 250 }])).toHaveLength(1)
  })

  it('should_accept_high_velocity_with_null_altitude', () => {
    expect(filterMeaningful([{ altitude: null, velocity: 150 }])).toHaveLength(1)
  })

  it('should_reject_null_altitude_and_null_velocity', () => {
    expect(filterMeaningful([{ altitude: null, velocity: null }])).toHaveLength(0)
  })

  it('should_reject_null_altitude_with_slow_velocity', () => {
    expect(filterMeaningful([{ altitude: null, velocity: 30 }])).toHaveLength(0)
  })

  it('should_filter_mixed_batch_correctly', () => {
    const positions: PositionLike[] = [
      { altitude: 12000, velocity: 250 },  // keep: high alt
      { altitude: 500,   velocity: 30  },  // drop: low alt + slow
      { altitude: null,  velocity: 200 },  // keep: fast
      { altitude: 0,     velocity: 0   },  // drop: ground
    ]
    expect(filterMeaningful(positions)).toHaveLength(2)
  })
})
