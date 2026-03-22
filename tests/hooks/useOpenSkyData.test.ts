import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOpenSkyData } from '@/hooks/useOpenSkyData'

// Flush the microtask/promise queue several times
const flushAsync = async (cycles = 5) => {
  for (let i = 0; i < cycles; i++) await Promise.resolve()
}

// Valid minimal OpenSky state array
function validState(icao24 = 'abc123', lon = 2.55, lat = 49.01): unknown[] {
  return [icao24, 'AF1234', 'France', 1609459200, 1609459200, lon, lat, 10500, false, 245, 285, 0, null, null, null, false, 0]
}

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }))
}

describe('useOpenSkyData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should_start_with_null_lastUpdate', () => {
    mockFetch(200, { states: [] })
    const { result } = renderHook(() => useOpenSkyData())
    expect(result.current.lastUpdate).toBeNull()
  })

  it('should_start_with_zero_flight_count', () => {
    mockFetch(200, { states: [] })
    const { result } = renderHook(() => useOpenSkyData())
    expect(result.current.flightCount).toBe(0)
  })

  it('should_populate_flightStatesRef_after_successful_fetch', async () => {
    mockFetch(200, { states: [validState('abc123')] })
    const { result } = renderHook(() => useOpenSkyData())

    // Fire the 0ms initial timeout synchronously
    act(() => { vi.advanceTimersByTime(1) })
    // Flush the fetch promise chain (multiple microtask cycles)
    await flushAsync(10)
    // Flush any pending React state updates
    act(() => {})

    expect(result.current.flightStatesRef.current.has('abc123')).toBe(true)
  })

  it('should_set_lastUpdate_after_successful_fetch', async () => {
    mockFetch(200, { states: [validState()] })
    const { result } = renderHook(() => useOpenSkyData())

    act(() => { vi.advanceTimersByTime(1) })
    // Flush fetch promise chain AND React state updates in one async act
    await act(async () => { await flushAsync(10) })

    expect(result.current.lastUpdate).not.toBeNull()
  })

  it('should_keep_retrying_indefinitely_on_error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    renderHook(() => useOpenSkyData())

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>

    // First error at t=0
    act(() => { vi.advanceTimersByTime(1) })
    await act(async () => { await flushAsync(10) })

    // Second retry after FETCH_INTERVAL_MS
    act(() => { vi.advanceTimersByTime(10_001) })
    await act(async () => { await flushAsync(10) })

    // Third retry — should still be fetching (not bailed out)
    act(() => { vi.advanceTimersByTime(10_001) })
    await act(async () => { await flushAsync(10) })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('should_use_30s_backoff_on_429', async () => {
    mockFetch(429, null)
    renderHook(() => useOpenSkyData())

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>

    // Trigger first fetch (t=0)
    act(() => { vi.advanceTimersByTime(1) })
    await flushAsync(10)
    expect(fetchMock.mock.calls.length).toBe(1)

    // Advance only 10s — should NOT trigger retry (backoff is 30s)
    act(() => { vi.advanceTimersByTime(10_001) })
    await flushAsync(5)
    expect(fetchMock.mock.calls.length).toBe(1)

    // Advance 20 more seconds (30s total) — now retry should fire
    act(() => { vi.advanceTimersByTime(20_001) })
    await flushAsync(10)
    expect(fetchMock.mock.calls.length).toBe(2)
  })

  it('should_keep_retrying_on_syntax_error_from_malformed_json', async () => {
    // Simulate a 200 response whose .json() throws SyntaxError (malformed body).
    // This exercises the hook's catch block — which previously killed the retry loop.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
    }))
    const { result } = renderHook(() => useOpenSkyData())
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>

    // First attempt at t=0
    act(() => { vi.advanceTimersByTime(1) })
    await act(async () => { await flushAsync(10) })

    // Retry after FETCH_INTERVAL_MS
    act(() => { vi.advanceTimersByTime(10_001) })
    await act(async () => { await flushAsync(10) })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    // Error state must be set (loop is alive but data is unavailable)
    expect(result.current.error).toBe('network-error')
  })

  it('should_set_error_on_http_failure_and_clear_on_success', async () => {
    // First call: HTTP 503
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve(null) })
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ states: [] }) })
    )
    const { result } = renderHook(() => useOpenSkyData())

    // Trigger first (failing) fetch
    act(() => { vi.advanceTimersByTime(1) })
    await act(async () => { await flushAsync(10) })
    expect(result.current.error).toBe('HTTP 503')

    // Trigger retry — should succeed and clear error
    act(() => { vi.advanceTimersByTime(10_001) })
    await act(async () => { await flushAsync(10) })
    expect(result.current.error).toBeNull()
  })

  it('should_abort_fetch_on_unmount', () => {
    const abortSpy = vi.fn()
    vi.stubGlobal('AbortController', class {
      signal = { aborted: false } as AbortSignal
      abort = abortSpy
    })
    mockFetch(200, { states: [] })

    const { unmount } = renderHook(() => useOpenSkyData())
    unmount()

    expect(abortSpy).toHaveBeenCalled()
  })
})
