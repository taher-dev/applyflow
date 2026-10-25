import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Request, Response } from 'express'
import { app } from '../server/dist/app.js'

/**
 * Vercel Serverless Function entry point for ApplyFlow API.
 * Forwards incoming /api requests to the configured Express application instance.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  // Ensure the URL maintains the /api prefix if stripped during Vercel route rewrites
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
  }
  app(req as unknown as Request, res as unknown as Response)
}

export { app }
