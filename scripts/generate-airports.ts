/**
 * generate-airports.ts
 * Downloads OurAirports CSV and generates src/data/airports-major.json + airports-minor.json
 * Run with: npm run generate-airports
 *
 * Output format: [{ code, icao, name, lat, lon }, ...]
 *   - airports-major.json : large_airport  (~600 entries, always rendered)
 *   - airports-minor.json : medium_airport (~3500 entries, rendered only when zoomed in)
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const AIRPORTS_CSV_URL = 'https://ourairports.com/data/airports.csv'
const OUT_DIR = join(process.cwd(), 'src', 'data')

interface Airport {
  code: string   // IATA  (3 letters)
  icao: string   // ICAO  (4 letters, = OurAirports 'ident')
  name: string
  lat:  number
  lon:  number
}

/** Minimal RFC 4180-compliant CSV line parser */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

async function main() {
  console.log(`Downloading ${AIRPORTS_CSV_URL} …`)
  const resp = await fetch(AIRPORTS_CSV_URL)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const text = await resp.text()

  const lines = text.split('\n')
  const header = parseCSVLine(lines[0])

  // OurAirports column indices (varies by version — derive from header row)
  const col = {
    type:      header.indexOf('type'),
    name:      header.indexOf('name'),
    lat:       header.indexOf('latitude_deg'),
    lon:       header.indexOf('longitude_deg'),
    icao:      header.indexOf('ident'),      // 4-letter ICAO is stored in 'ident'
    iata:      header.indexOf('iata_code'),
    scheduled: header.indexOf('scheduled_service'),
  }

  for (const [key, idx] of Object.entries(col)) {
    if (idx === -1) throw new Error(`Column not found in CSV header: ${key}`)
  }

  console.log('Parsing …')

  // Candidate map: IATA code → best entry seen so far
  // Tie-breaking: large_airport > medium_airport, then scheduled_service=yes > no
  const candidates = new Map<string, { airport: Airport; isLarge: boolean; scheduled: boolean }>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line)
    const type = cols[col.type]

    if (type !== 'large_airport' && type !== 'medium_airport') continue

    const iata = cols[col.iata]?.trim()
    const icao = cols[col.icao]?.trim()
    const name = cols[col.name]?.trim()

    // Both IATA (3 letters) and ICAO (4 letters) required
    if (!iata || iata.length !== 3 || !/^[A-Z]{3}$/.test(iata)) continue
    if (!icao || icao.length !== 4 || !/^[A-Z]{4}$/.test(icao)) continue
    if (!name) continue

    const lat = parseFloat(cols[col.lat])
    const lon = parseFloat(cols[col.lon])
    if (!isFinite(lat) || !isFinite(lon)) continue
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue

    const isLarge   = type === 'large_airport'
    const scheduled = cols[col.scheduled]?.trim() === 'yes'

    const airport: Airport = {
      code: iata,
      icao,
      name,
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
    }

    const existing = candidates.get(iata)
    if (!existing) {
      candidates.set(iata, { airport, isLarge, scheduled })
    } else if (isLarge && !existing.isLarge) {
      // Prefer large over medium
      candidates.set(iata, { airport, isLarge, scheduled })
    } else if (isLarge === existing.isLarge && scheduled && !existing.scheduled) {
      // Same tier: prefer scheduled service
      candidates.set(iata, { airport, isLarge, scheduled })
    }
  }

  const major: Airport[] = []
  const minor: Airport[] = []

  for (const { airport, isLarge } of candidates.values()) {
    if (isLarge) major.push(airport)
    else         minor.push(airport)
  }

  // Deterministic sort
  major.sort((a, b) => a.code.localeCompare(b.code))
  minor.sort((a, b) => a.code.localeCompare(b.code))

  console.log(`large_airport  (major): ${major.length}`)
  console.log(`medium_airport (minor): ${minor.length}`)
  console.log(`Total                 : ${major.length + minor.length}`)

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'airports-major.json'), JSON.stringify(major))
  writeFileSync(join(OUT_DIR, 'airports-minor.json'), JSON.stringify(minor))
  console.log('✓ src/data/airports-major.json')
  console.log('✓ src/data/airports-minor.json')
}

main().catch((err) => { console.error(err); process.exit(1) })
