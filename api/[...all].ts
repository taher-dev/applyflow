import type { IncomingMessage, ServerResponse } from 'node:http'
import handler, { app } from './index.ts'

/**
 * Vercel Serverless Function Catch-All entry point for ApplyFlow API.
 * Routes all /api/* requests (e.g. /api/auth/login, /api/auth/google) to Express.
 */
export default function catchAllHandler(req: IncomingMessage, res: ServerResponse): void {
  handler(req, res)
}

export { app }
