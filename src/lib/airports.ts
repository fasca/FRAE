import type { Airport } from '@/types/index'

export const AIRPORTS: readonly Airport[] = [
  { code: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.01, lon: 2.55 },
  { code: 'JFK', name: 'New York JFK', lat: 40.64, lon: -73.78 },
  { code: 'LHR', name: 'London Heathrow', lat: 51.47, lon: -0.46 },
  { code: 'NRT', name: 'Tokyo Narita', lat: 35.76, lon: 140.39 },
  { code: 'LAX', name: 'Los Angeles', lat: 33.94, lon: -118.41 },
  { code: 'DXB', name: 'Dubai', lat: 25.25, lon: 55.36 },
  { code: 'SIN', name: 'Singapore Changi', lat: 1.35, lon: 103.99 },
  { code: 'FRA', name: 'Frankfurt', lat: 50.03, lon: 8.57 },
  { code: 'AMS', name: 'Amsterdam Schiphol', lat: 52.31, lon: 4.76 },
  { code: 'PEK', name: 'Beijing Capital', lat: 40.08, lon: 116.58 },
  { code: 'SYD', name: 'Sydney', lat: -33.95, lon: 151.18 },
  { code: 'GRU', name: 'São Paulo Guarulhos', lat: -23.43, lon: -46.47 },
  { code: 'JNB', name: 'Johannesburg', lat: -26.14, lon: 28.25 },
  { code: 'MEX', name: 'Mexico City', lat: 19.44, lon: -99.07 },
  { code: 'BOM', name: 'Mumbai', lat: 19.09, lon: 72.87 },
  { code: 'ICN', name: 'Seoul Incheon', lat: 37.46, lon: 126.44 },
  { code: 'YYZ', name: 'Toronto Pearson', lat: 43.68, lon: -79.63 },
  { code: 'EZE', name: 'Buenos Aires Ezeiza', lat: -34.82, lon: -58.54 },
  { code: 'DFW', name: 'Dallas Fort Worth', lat: 32.90, lon: -97.04 },
  { code: 'ORD', name: "Chicago O'Hare", lat: 41.97, lon: -87.91 },
  { code: 'ATL', name: 'Atlanta', lat: 33.64, lon: -84.43 },
  { code: 'IST', name: 'Istanbul', lat: 41.26, lon: 28.74 },
  { code: 'MAD', name: 'Madrid Barajas', lat: 40.47, lon: -3.56 },
  { code: 'BCN', name: 'Barcelona', lat: 41.30, lon: 2.08 },
  { code: 'MUC', name: 'Munich', lat: 48.35, lon: 11.79 },
  { code: 'ZRH', name: 'Zurich', lat: 47.46, lon: 8.55 },
  { code: 'HKG', name: 'Hong Kong', lat: 22.31, lon: 113.91 },
  { code: 'BKK', name: 'Bangkok Suvarnabhumi', lat: 13.69, lon: 100.75 },
  { code: 'DEL', name: 'New Delhi Indira Gandhi', lat: 28.56, lon: 77.10 },
  { code: 'CGK', name: 'Jakarta Soekarno-Hatta', lat: -6.13, lon: 106.66 },
] as const

export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(a => a.code === code)
}

export function getRandomAirportPair(): [Airport, Airport] {
  const i = Math.floor(Math.random() * AIRPORTS.length)
  let j = Math.floor(Math.random() * (AIRPORTS.length - 1))
  if (j >= i) j++
  return [AIRPORTS[i], AIRPORTS[j]]
}
