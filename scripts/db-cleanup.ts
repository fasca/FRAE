/**
 * One-shot database cleanup script.
 * Removes junk data accumulated before the altitude filter was added.
 *
 * Usage:
 *   npx tsx scripts/db-cleanup.ts
 *
 * Actions:
 *   1. Delete ground positions (on_ground = 1)
 *   2. Delete low-altitude, low-velocity positions (altitude < 5000 AND velocity < 100)
 *   3. Delete circular routes (departure_icao = arrival_icao)
 *   4. Delete routes with invalid callsign (length < 3)
 *   5. VACUUM to reclaim disk space
 *   6. Print before/after stats
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'frae.db')

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found: ${DB_PATH}`)
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('busy_timeout = 10000')
db.pragma('journal_mode = WAL')

function dbSizeMb(): number {
  return fs.statSync(DB_PATH).size / (1024 * 1024)
}

function countRow(table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  return row.n
}

const SEP = '-'.repeat(60)

console.log(SEP)
console.log('FRAE Database Cleanup')
console.log(SEP)
console.log('\nBefore:')
console.log(`  DB size      : ${dbSizeMb().toFixed(1)} MB`)
console.log(`  positions    : ${countRow('positions').toLocaleString()} rows`)
console.log(`  flights      : ${countRow('flights').toLocaleString()} rows`)
console.log(`  routes       : ${countRow('routes').toLocaleString()} rows`)
console.log(`  tracks       : ${countRow('tracks').toLocaleString()} rows`)

console.log('\nRunning cleanup...')

// 1. Ground positions
const groundResult = db.prepare('DELETE FROM positions WHERE on_ground = 1').run()
console.log(`  Deleted ground positions      : ${groundResult.changes.toLocaleString()}`)

// 2. Low-altitude, low-velocity positions (local traffic / helicopters)
const lowAltResult = db.prepare(
  'DELETE FROM positions WHERE (altitude IS NULL OR altitude < 5000) AND (velocity IS NULL OR velocity < 100)'
).run()
console.log(`  Deleted low-alt/vel positions : ${lowAltResult.changes.toLocaleString()}`)

// 3. Circular routes (departure = arrival — test/garbage data)
const circularResult = db.prepare(
  'DELETE FROM routes WHERE departure_icao IS NOT NULL AND departure_icao = arrival_icao'
).run()
console.log(`  Deleted circular routes       : ${circularResult.changes.toLocaleString()}`)

// 4. Routes with suspiciously short callsign
const badCallsignResult = db.prepare(
  "DELETE FROM routes WHERE length(callsign) < 3"
).run()
console.log(`  Deleted short-callsign routes : ${badCallsignResult.changes.toLocaleString()}`)

// 5. VACUUM rebuilds the DB file and reclaims freed pages
console.log('\nRunning VACUUM (this may take a while)...')
db.exec('VACUUM')

console.log('\nAfter:')
console.log(`  DB size      : ${dbSizeMb().toFixed(1)} MB`)
console.log(`  positions    : ${countRow('positions').toLocaleString()} rows`)
console.log(`  flights      : ${countRow('flights').toLocaleString()} rows`)
console.log(`  routes       : ${countRow('routes').toLocaleString()} rows`)
console.log(`  tracks       : ${countRow('tracks').toLocaleString()} rows`)
console.log('\n' + SEP)
console.log('Done.')

db.close()
