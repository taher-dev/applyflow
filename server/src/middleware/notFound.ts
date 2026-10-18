import type { Request, Response } from 'express'

/**
 * 404 Not Found middleware.
 * Handles any incoming requests that do not match existing registered routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
}
