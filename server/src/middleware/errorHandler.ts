import type { ErrorRequestHandler } from 'express'
import { env } from '../config/env.js'

/**
 * Centralized error-handling middleware.
 * Express identifies this as an error handler by its four parameters (err, req, res, next).
 * Prevents stack trace or internal error leakage in production.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next
  const statusCode =
    typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : 500

  // Log full error details for debugging in non-test environments
  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled server error:', err)
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message:
      env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected error occurred'
        : err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
