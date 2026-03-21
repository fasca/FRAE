/**
 * Static airport database — ~118 intercontinental hubs and strategic stopover airports.
 * Focused on long-haul routes (no regional airports).
 * Each entry includes both IATA (code) and ICAO (icao) identifiers.
 * ICAO codes are used for route lookup from OpenSky flight data.
 */
import type { Airport } from '@/types/index'

export const AIRPORTS: readonly Airport[] = [
  // ── Europe — Western ──────────────────────────────────────────────────────
  { code: 'CDG', icao: 'LFPG', name: 'Paris Charles de Gaulle',        lat:  49.01, lon:    2.55 },
  { code: 'LHR', icao: 'EGLL', name: 'London Heathrow',                lat:  51.47, lon:   -0.46 },
  { code: 'AMS', icao: 'EHAM', name: 'Amsterdam Schiphol',             lat:  52.31, lon:    4.76 },
  { code: 'FRA', icao: 'EDDF', name: 'Frankfurt',                      lat:  50.03, lon:    8.57 },
  { code: 'MAD', icao: 'LEMD', name: 'Madrid Barajas',                 lat:  40.47, lon:   -3.56 },
  { code: 'BCN', icao: 'LEBL', name: 'Barcelona',                      lat:  41.30, lon:    2.08 },
  { code: 'MUC', icao: 'EDDM', name: 'Munich',                         lat:  48.35, lon:   11.79 },
  { code: 'ZRH', icao: 'LSZH', name: 'Zurich',                         lat:  47.46, lon:    8.55 },
  { code: 'FCO', icao: 'LIRF', name: 'Rome Fiumicino',                 lat:  41.80, lon:   12.25 },
  { code: 'LIS', icao: 'LPPT', name: 'Lisbon',                         lat:  38.78, lon:   -9.14 },
  { code: 'VIE', icao: 'LOWW', name: 'Vienna',                         lat:  48.11, lon:   16.57 },
  { code: 'BRU', icao: 'EBBR', name: 'Brussels',                       lat:  50.90, lon:    4.48 },
  { code: 'DUB', icao: 'EIDW', name: 'Dublin',                         lat:  53.43, lon:   -6.27 },
  { code: 'GVA', icao: 'LSGG', name: 'Geneva',                         lat:  46.24, lon:    6.11 },

  // ── Europe — Northern ─────────────────────────────────────────────────────
  { code: 'CPH', icao: 'EKCH', name: 'Copenhagen Kastrup',             lat:  55.63, lon:   12.66 },
  { code: 'ARN', icao: 'ESSA', name: 'Stockholm Arlanda',              lat:  59.65, lon:   17.92 },
  { code: 'OSL', icao: 'ENGM', name: 'Oslo Gardermoen',                lat:  60.20, lon:   11.08 },
  { code: 'HEL', icao: 'EFHK', name: 'Helsinki Vantaa',                lat:  60.32, lon:   24.97 },
  { code: 'KEF', icao: 'BIKF', name: 'Reykjavik Keflavik',             lat:  63.99, lon:  -22.63 },

  // ── Europe — Eastern / Southeastern ──────────────────────────────────────
  { code: 'WAW', icao: 'EPWA', name: 'Warsaw Chopin',                  lat:  52.17, lon:   20.97 },
  { code: 'PRG', icao: 'LKPR', name: 'Prague Václav Havel',            lat:  50.10, lon:   14.26 },
  { code: 'ATH', icao: 'LGAV', name: 'Athens Eleftherios Venizelos',   lat:  37.94, lon:   23.95 },
  { code: 'BER', icao: 'EDDB', name: 'Berlin Brandenburg',             lat:  52.37, lon:   13.52 },
  { code: 'IST', icao: 'LTFM', name: 'Istanbul',                       lat:  41.26, lon:   28.74 },

  // ── Russia / Central Asia ─────────────────────────────────────────────────
  { code: 'SVO', icao: 'UUEE', name: 'Moscow Sheremetyevo',            lat:  55.97, lon:   37.41 },
  { code: 'LED', icao: 'ULLI', name: 'Saint Petersburg Pulkovo',       lat:  59.80, lon:   30.27 },
  { code: 'ALA', icao: 'UAAA', name: 'Almaty',                         lat:  43.35, lon:   77.04 },
  { code: 'TAS', icao: 'UTTT', name: 'Tashkent',                       lat:  41.26, lon:   69.28 },
  { code: 'VVO', icao: 'UHWW', name: 'Vladivostok',                    lat:  43.40, lon:  132.15 },

  // ── Middle East ───────────────────────────────────────────────────────────
  { code: 'DXB', icao: 'OMDB', name: 'Dubai',                          lat:  25.25, lon:   55.36 },
  { code: 'DOH', icao: 'OTHH', name: 'Doha Hamad',                     lat:  25.27, lon:   51.61 },
  { code: 'AUH', icao: 'OMAA', name: 'Abu Dhabi',                      lat:  24.44, lon:   54.65 },
  { code: 'RUH', icao: 'OERK', name: 'Riyadh King Khalid',             lat:  24.96, lon:   46.70 },
  { code: 'JED', icao: 'OEJN', name: 'Jeddah King Abdulaziz',          lat:  21.68, lon:   39.16 },
  { code: 'MCT', icao: 'OOMS', name: 'Muscat',                         lat:  23.60, lon:   58.28 },
  { code: 'AMM', icao: 'OJAI', name: 'Amman Queen Alia',               lat:  31.72, lon:   35.99 },
  { code: 'TLV', icao: 'LLBG', name: 'Tel Aviv Ben Gurion',            lat:  32.01, lon:   34.89 },
  { code: 'IKA', icao: 'OIIE', name: 'Tehran Imam Khomeini',           lat:  35.41, lon:   51.15 },
  { code: 'KWI', icao: 'OKBK', name: 'Kuwait',                         lat:  29.23, lon:   47.97 },
  { code: 'BAH', icao: 'OBBI', name: 'Bahrain',                        lat:  26.27, lon:   50.63 },

  // ── South Asia ────────────────────────────────────────────────────────────
  { code: 'DEL', icao: 'VIDP', name: 'New Delhi Indira Gandhi',        lat:  28.56, lon:   77.10 },
  { code: 'BOM', icao: 'VABB', name: 'Mumbai',                         lat:  19.09, lon:   72.87 },
  { code: 'MAA', icao: 'VOMM', name: 'Chennai',                        lat:  12.99, lon:   80.17 },
  { code: 'BLR', icao: 'VOBL', name: 'Bangalore Kempegowda',           lat:  13.20, lon:   77.71 },
  { code: 'CCU', icao: 'VECC', name: 'Kolkata',                        lat:  22.65, lon:   88.45 },
  { code: 'CMB', icao: 'VCBI', name: 'Colombo Bandaranaike',           lat:   7.18, lon:   79.88 },
  { code: 'MLE', icao: 'VRMM', name: 'Malé Velana',                    lat:   4.19, lon:   73.53 },
  { code: 'KTM', icao: 'VNKT', name: 'Kathmandu Tribhuvan',            lat:  27.70, lon:   85.36 },
  { code: 'DAC', icao: 'VGHS', name: 'Dhaka Shahjalal',                lat:  23.84, lon:   90.40 },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  { code: 'SIN', icao: 'WSSS', name: 'Singapore Changi',               lat:   1.35, lon:  103.99 },
  { code: 'BKK', icao: 'VTBS', name: 'Bangkok Suvarnabhumi',           lat:  13.69, lon:  100.75 },
  { code: 'KUL', icao: 'WMKK', name: 'Kuala Lumpur',                   lat:   2.74, lon:  101.71 },
  { code: 'CGK', icao: 'WIII', name: 'Jakarta Soekarno-Hatta',         lat:  -6.13, lon:  106.66 },
  { code: 'MNL', icao: 'RPLL', name: 'Manila Ninoy Aquino',            lat:  14.51, lon:  121.02 },
  { code: 'SGN', icao: 'VVTS', name: 'Ho Chi Minh Tan Son Nhat',       lat:  10.82, lon:  106.65 },
  { code: 'HAN', icao: 'VVNB', name: 'Hanoi Noi Bai',                  lat:  21.22, lon:  105.81 },
  { code: 'RGN', icao: 'VYYY', name: 'Yangon',                         lat:  16.91, lon:   96.13 },

  // ── East Asia ─────────────────────────────────────────────────────────────
  { code: 'HKG', icao: 'VHHH', name: 'Hong Kong',                      lat:  22.31, lon:  113.91 },
  { code: 'PEK', icao: 'ZBAA', name: 'Beijing Capital',                lat:  40.08, lon:  116.58 },
  { code: 'PVG', icao: 'ZSPD', name: 'Shanghai Pudong',                lat:  31.14, lon:  121.80 },
  { code: 'CAN', icao: 'ZGGG', name: 'Guangzhou Baiyun',               lat:  23.39, lon:  113.30 },
  { code: 'NRT', icao: 'RJAA', name: 'Tokyo Narita',                   lat:  35.76, lon:  140.39 },
  { code: 'KIX', icao: 'RJBB', name: 'Osaka Kansai',                   lat:  34.43, lon:  135.24 },
  { code: 'ICN', icao: 'RKSI', name: 'Seoul Incheon',                  lat:  37.46, lon:  126.44 },
  { code: 'TPE', icao: 'RCTP', name: 'Taipei Taoyuan',                 lat:  25.08, lon:  121.23 },
  { code: 'CTS', icao: 'RJCC', name: 'Sapporo New Chitose',            lat:  42.78, lon:  141.69 },
  { code: 'ULN', icao: 'ZMCK', name: 'Ulaanbaatar',                    lat:  47.85, lon:  106.77 },

  // ── Pacific / Oceania ─────────────────────────────────────────────────────
  { code: 'SYD', icao: 'YSSY', name: 'Sydney',                         lat: -33.95, lon:  151.18 },
  { code: 'AKL', icao: 'NZAA', name: 'Auckland',                       lat: -37.01, lon:  174.79 },
  { code: 'HNL', icao: 'PHNL', name: 'Honolulu Daniel K. Inouye',      lat:  21.32, lon: -157.93 },
  { code: 'PPT', icao: 'NTAA', name: 'Papeete Tahiti Faa\'a',          lat: -17.55, lon: -149.61 },
  { code: 'NOU', icao: 'NWWW', name: 'Nouméa La Tontouta',             lat: -22.01, lon:  166.21 },
  { code: 'NAN', icao: 'NFFN', name: 'Nadi Fiji',                      lat: -17.75, lon:  177.44 },
  { code: 'GUM', icao: 'PGUM', name: 'Guam Antonio Won Pat',           lat:  13.48, lon:  144.80 },
  { code: 'ANC', icao: 'PANC', name: 'Anchorage',                      lat:  61.17, lon: -150.00 },

  // ── North America ─────────────────────────────────────────────────────────
  { code: 'JFK', icao: 'KJFK', name: 'New York JFK',                   lat:  40.64, lon:  -73.78 },
  { code: 'EWR', icao: 'KEWR', name: 'Newark',                         lat:  40.69, lon:  -74.17 },
  { code: 'BOS', icao: 'KBOS', name: 'Boston Logan',                   lat:  42.36, lon:  -71.01 },
  { code: 'IAD', icao: 'KIAD', name: 'Washington Dulles',              lat:  38.94, lon:  -77.47 },
  { code: 'ATL', icao: 'KATL', name: 'Atlanta',                        lat:  33.64, lon:  -84.43 },
  { code: 'MIA', icao: 'KMIA', name: 'Miami',                          lat:  25.80, lon:  -80.28 },
  { code: 'ORD', icao: 'KORD', name: "Chicago O'Hare",                 lat:  41.97, lon:  -87.91 },
  { code: 'DFW', icao: 'KDFW', name: 'Dallas Fort Worth',              lat:  32.90, lon:  -97.04 },
  { code: 'LAX', icao: 'KLAX', name: 'Los Angeles',                    lat:  33.94, lon: -118.41 },
  { code: 'SFO', icao: 'KSFO', name: 'San Francisco',                  lat:  37.62, lon: -122.38 },
  { code: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma',                 lat:  47.45, lon: -122.31 },
  { code: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson',                lat:  43.68, lon:  -79.63 },
  { code: 'YVR', icao: 'CYVR', name: 'Vancouver',                      lat:  49.19, lon: -123.18 },

  // ── Central America / Caribbean ───────────────────────────────────────────
  { code: 'MEX', icao: 'MMMX', name: 'Mexico City',                    lat:  19.44, lon:  -99.07 },
  { code: 'CUN', icao: 'MMUN', name: 'Cancún',                         lat:  21.04, lon:  -86.88 },
  { code: 'PTY', icao: 'MPTO', name: 'Panama City Tocumen',            lat:   9.07, lon:  -79.38 },
  { code: 'HAV', icao: 'MUHA', name: 'Havana José Martí',              lat:  22.99, lon:  -82.41 },
  { code: 'PUJ', icao: 'MDPC', name: 'Punta Cana',                     lat:  18.57, lon:  -68.36 },

  // ── South America ─────────────────────────────────────────────────────────
  { code: 'BOG', icao: 'SKBO', name: 'Bogota El Dorado',               lat:   4.70, lon:  -74.14 },
  { code: 'UIO', icao: 'SEQM', name: 'Quito Mariscal Sucre',           lat:  -0.13, lon:  -78.36 },
  { code: 'LIM', icao: 'SPIM', name: 'Lima Jorge Chávez',              lat: -12.02, lon:  -77.11 },
  { code: 'SCL', icao: 'SCEL', name: 'Santiago Arturo Merino',         lat: -33.39, lon:  -70.79 },
  { code: 'GRU', icao: 'SBGR', name: 'São Paulo Guarulhos',            lat: -23.43, lon:  -46.47 },
  { code: 'GIG', icao: 'SBGL', name: 'Rio de Janeiro Galeão',          lat: -22.81, lon:  -43.25 },
  { code: 'EZE', icao: 'SAEZ', name: 'Buenos Aires Ezeiza',            lat: -34.82, lon:  -58.54 },
  { code: 'MVD', icao: 'SUMU', name: 'Montevideo Carrasco',            lat: -34.84, lon:  -56.03 },
  { code: 'CCS', icao: 'SVMI', name: 'Caracas Simón Bolívar',          lat:  10.60, lon:  -66.99 },

  // ── Africa — North ────────────────────────────────────────────────────────
  { code: 'CAI', icao: 'HECA', name: 'Cairo',                          lat:  30.12, lon:   31.40 },
  { code: 'CMN', icao: 'GMMN', name: 'Casablanca Mohammed V',          lat:  33.37, lon:   -7.59 },
  { code: 'ALG', icao: 'DAAG', name: 'Algiers Houari Boumediene',      lat:  36.69, lon:    3.22 },
  { code: 'TUN', icao: 'DTTA', name: 'Tunis-Carthage',                 lat:  36.85, lon:   10.23 },

  // ── Africa — Sub-Saharan ──────────────────────────────────────────────────
  { code: 'NBO', icao: 'HKJK', name: 'Nairobi Jomo Kenyatta',         lat:  -1.32, lon:   36.93 },
  { code: 'ADD', icao: 'HAAB', name: 'Addis Ababa Bole',               lat:   8.98, lon:   38.80 },
  { code: 'LOS', icao: 'DNMM', name: 'Lagos Murtala Muhammed',         lat:   6.58, lon:    3.32 },
  { code: 'ACC', icao: 'DGAA', name: 'Accra Kotoka',                   lat:   5.60, lon:   -0.17 },
  { code: 'DAR', icao: 'HTDA', name: 'Dar es Salaam',                  lat:  -6.88, lon:   39.20 },
  { code: 'JNB', icao: 'FAOR', name: 'Johannesburg',                   lat: -26.14, lon:   28.25 },
  { code: 'CPT', icao: 'FACT', name: 'Cape Town',                      lat: -33.96, lon:   18.60 },
  { code: 'MRU', icao: 'FIMP', name: 'Mauritius Sir S. Ramgoolam',     lat: -20.43, lon:   57.68 },
]

/** Lookup by IATA code (e.g. 'CDG') */
export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(a => a.code === code)
}

/** Lookup by ICAO code (e.g. 'LFPG') — used for route resolution from OpenSky data */
export function getAirportByIcao(icao: string): Airport | undefined {
  return AIRPORTS.find(a => a.icao === icao)
}

export function getRandomAirportPair(): [Airport, Airport] {
  const i = Math.floor(Math.random() * AIRPORTS.length)
  let j = Math.floor(Math.random() * (AIRPORTS.length - 1))
  if (j >= i) j++
  return [AIRPORTS[i], AIRPORTS[j]]
}
