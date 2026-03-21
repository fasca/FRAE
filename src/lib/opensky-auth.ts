/**
 * OpenSky OAuth2 Client Credentials authentication — server-side only.
 * Token is cached module-level for the 30-minute lifetime.
 * Re-fetches automatically 60s before expiry.
 */

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

let cachedToken: string | null = null
let tokenExpiry = 0  // Unix ms timestamp when token expires

/** Returns a valid Bearer token, fetching a new one if necessary. */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  // Refresh 60s before expiry to avoid edge-of-window failures
  if (cachedToken && now < tokenExpiry - 60_000) {
    return cachedToken
  }

  const clientId     = process.env.OPENSKY_CLIENT_ID
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET env vars are required')
  }

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenSky token fetch failed: ${response.status} ${text}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  cachedToken  = data.access_token
  tokenExpiry  = now + data.expires_in * 1000
  return cachedToken
}
