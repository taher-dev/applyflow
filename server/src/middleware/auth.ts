import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { SESSION_COOKIE_NAME, validateSessionToken } from '../lib/session.js'
import '../types/auth.js'

/**
 * Authentication middleware.
 *
 * Checks for a real session token inside the HttpOnly session cookie,
 * hashes the presented token, and looks up the active session in PostgreSQL.
 *
 * In production/development:
 * Rejects missing, revoked, or expired sessions with HTTP 401 Unauthorized.
 * Arbitrary headers, query params, and body properties are never trusted.
 *
 * Test Seam:
 * Exclusively when env.NODE_ENV === 'test', allows automated test suites to supply
 * a verified test user context via 'X-Test-User-Id' (and optional 'X-Test-User-Email').
 * This seam is strictly impossible to activate in production or development.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // 1. Check for real session cookie
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME]

    if (sessionToken && typeof sessionToken === 'string') {
      const authResult = await validateSessionToken(sessionToken)
      if (authResult) {
        req.user = authResult.user
        return next()
      }
    }

    // 2. Safe test seam: strictly gated to test environment only
    if (env.NODE_ENV === 'test') {
      const testUserId = req.headers['x-test-user-id']
      if (typeof testUserId === 'string' && testUserId.trim().length > 0) {
        req.user = {
          id: testUserId.trim(),
          email:
            typeof req.headers['x-test-user-email'] === 'string'
              ? req.headers['x-test-user-email'].trim()
              : `${testUserId.trim()}@applyflow.test`,
          name: 'Test User',
        }
        return next()
      }
    }

    // 3. Reject unauthenticated requests
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. No valid session found.',
    })
  } catch (error) {
    next(error)
  }
}
