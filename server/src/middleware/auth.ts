import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import '../types/auth.js'

/**
 * Authentication middleware.
 *
 * In production/development:
 * Rejects requests with HTTP 401 Unauthorized unless a valid authenticated
 * user context is attached to the request. Arbitrary headers, query params,
 * and body properties are never trusted.
 * Full JWT / session authentication will be implemented in a subsequent milestone.
 *
 * Test Seam:
 * Exclusively when env.NODE_ENV === 'test', allows automated test suites to supply
 * a verified test user context via 'X-Test-User-Id' (and optional 'X-Test-User-Email').
 * This seam is strictly impossible to activate in production or development.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  // Safe test seam: strictly gated to test environment only
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

  // If user context was already populated upstream
  if (req.user && req.user.id) {
    return next()
  }

  // Reject unauthenticated requests
  res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. No valid session or token provided.',
  })
}
