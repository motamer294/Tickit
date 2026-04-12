/**
 * JWT Token Utilities
 * Decode JWT tokens to extract user information
 */

export interface DecodedToken {
  user_id?: number
  username?: string
  user?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

/**
 * Decode a JWT token to extract claims
 * Note: This only decodes, it doesn't verify the signature
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part)
    const payload = parts[1]
    // Add padding if needed
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = atob(padded)
    const json = JSON.parse(decoded) as DecodedToken

    return json
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) {
    return true
  }

  // exp is in seconds, convert to milliseconds
  const expiryTime = decoded.exp * 1000
  return Date.now() > expiryTime
}

/**
 * Get user ID from JWT token
 */
export function getUserIdFromToken(token: string): number | null {
  const decoded = decodeJWT(token)
  if (!decoded) {
    return null
  }

  return (decoded.user_id || decoded.sub) as number | null
}
