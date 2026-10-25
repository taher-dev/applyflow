import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Request, Response } from 'express'
import { app } from '../server/dist/app.js'

/**
 * Vercel Serverless Function entry point for ApplyFlow API.
 * Forwards incoming /api requests to the configured Express application instance.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  // Restore full subpath from Vercel routing headers if rewrites collapsed req.url to /api
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined
  if (matchedPath && matchedPath.startsWith('/api')) {
    const queryIndex = req.url ? req.url.indexOf('?') : -1
    const query = queryIndex !== -1 && !matchedPath.includes('?') ? req.url!.slice(queryIndex) : ''
    req.url = `${matchedPath}${query}`
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
  }
  app(req as unknown as Request, res as unknown as Response)
}

export { app }
