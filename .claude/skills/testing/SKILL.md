---
name: testing
description: Génère des tests unitaires et d'intégration pour FRAE. Utiliser quand l'utilisateur dit "écris des tests", "ajoute des tests", "teste cette fonction", ou pour tout nouveau code créé dans src/lib/ ou src/components/.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Testing Patterns — AE Flight Radar

## Framework et Configuration

- Framework : Jest ou Vitest (selon le setup Next.js)
- Pattern : AAA (Arrange / Act / Assert)
- Un test = un comportement
- Nommage : `should_[comportement]_when_[condition]`

## Priorités

1. `opensky.ts` — parsing des index du tableau API (critique, mapping fragile)
2. `projection.ts` — math de rotation et translation
3. `flights.ts` — interpolation de position entre updates
4. `renderer.ts` — pipeline de dessin avec canvas mocké
5. Composants — mount/unmount cleanup

## Mocks essentiels

```typescript
// Mock fetch pour OpenSky
const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  json: async () => createMockOpenSkyResponse()
} as Response)

// Mock Canvas 2D Context
const mockCtx = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  drawImage: jest.fn(),
  fillText: jest.fn(),
  font: '',
  textAlign: 'left',
}

// Mock requestAnimationFrame
jest.useFakeTimers()
const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
  setTimeout(cb, 16)
  return 1
})
```

## Factories de données de test

```typescript
function createMockFlight(overrides?: Partial<Flight>): Flight {
  return {
    icao24: 'abc123',
    callsign: 'AF1234',
    originCountry: 'France',
    longitude: 2.35,
    latitude: 48.86,
    altitude: 11000,
    velocity: 250,
    heading: 270,
    verticalRate: 0,
    onGround: false,
    lastUpdate: 1700000000,
    ...overrides
  }
}

function createMockOpenSkyResponse() {
  return {
    time: 1700000000,
    states: [
      ['abc123', 'AF1234  ', 'France', 1700000000, 1700000000,
       2.35, 48.86, 11000, false, 250, 270, 0, null, 11000, null, false, 0]
    ]
  }
}
```

## Cas à toujours tester

1. **Happy path** — données valides, comportement attendu
2. **Null coordinates** — `longitude: null` ou `latitude: null` dans la réponse OpenSky
3. **HTTP errors** — 429 (rate limit), 500 (server error), network failure
4. **Empty response** — `states: null` ou `states: []`
5. **Cleanup** — RAF et intervals annulés au démontage du composant
6. **Valeurs limites** — altitude = 0, velocity = 0, heading = 360

## Structure

```
tests/lib/opensky.test.ts
tests/lib/projection.test.ts
tests/lib/flights.test.ts
tests/lib/renderer.test.ts
tests/components/MapCanvas.test.tsx
```
