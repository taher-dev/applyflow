import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Request, Response } from 'express'
import { app } from '../server/dist/app.js'

/**
 * Normalizes incoming request URLs across Vercel rewrite modes.
 * Recovers full subpath from __vercel_path query param, x-matched-path header, or raw URL.
 */
export function normalizeRequestUrl(rawUrl?: string, matchedPath?: string): string {
  if (!rawUrl) return '/api'

  try {
    const parsed = new URL(rawUrl, 'http://127.0.0.1')
    const vercelPath = parsed.searchParams.get('__vercel_path')

    if (vercelPath) {
      parsed.searchParams.delete('__vercel_path')
      const cleanPath = vercelPath.startsWith('/') ? vercelPath : `/${vercelPath}`
      const baseApi = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`
      return `${baseApi}${parsed.search}`
    }
  } catch {
    // If URL parsing fails, continue to header checks
  }

  if (matchedPath && matchedPath.startsWith('/api')) {
    const queryIndex = rawUrl.indexOf('?')
    const query = queryIndex !== -1 && !matchedPath.includes('?') ? rawUrl.slice(queryIndex) : ''
    return `${matchedPath}${query}`
  }

  if (!rawUrl.startsWith('/api')) {
    return `/api${rawUrl}`
  }

  return rawUrl
}

/**
 * Vercel Serverless Function entry point for ApplyFlow API.
 * Forwards incoming /api requests to the configured Express application instance.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path']) as string | undefined
  req.url = normalizeRequestUrl(req.url, matchedPath)
  app(req as unknown as Request, res as unknown as Response)
}

export { app }
