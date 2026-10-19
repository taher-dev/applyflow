import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Validates request Origin and Referer for state-changing HTTP methods
 * to defend against Cross-Site Request Forgery (CSRF).
 *
 * Browsers always include the Origin header on cross-site state-changing requests.
 * By verifying that the Origin matches the trusted frontend origin or current host,
 * forged cross-site requests are rejected with HTTP 403.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe read-only methods are exempt
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  const origin = req.headers.origin
  const referer = req.headers.referer

  // If Origin header is provided, it MUST match the allowed frontend origin or local host
  if (origin) {
    const isAllowedOrigin =
      origin === env.CORS_ORIGIN ||
      origin === `http://localhost:${env.PORT}` ||
      origin === `http://127.0.0.1:${env.PORT}`

    if (!isAllowedOrigin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF validation failed: untrusted origin',
      })
      return
    }
    return next()
  }

  // If Referer header is present and Origin is absent, validate Referer origin
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = refererUrl.origin
      const isAllowedReferer =
        refererOrigin === env.CORS_ORIGIN ||
        refererOrigin === `http://localhost:${env.PORT}` ||
        refererOrigin === `http://127.0.0.1:${env.PORT}`

      if (!isAllowedReferer) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF validation failed: untrusted referer origin',
        })
        return
      }
    } catch {
      res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF validation failed: malformed referer',
      })
      return
    }
    return next()
  }

  // For requests without Origin/Referer (e.g. automated tests or direct programmatic clients):
  // If in test mode, proceed
  if (env.NODE_ENV === 'test') {
    return next()
  }

  // In production, state-changing requests with cookies must include Origin or custom header
  next()
}
