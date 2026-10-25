import { Router } from 'express'
import type { Request, Response } from 'express'

export const healthRouter = Router()

/**
 * GET /api/health
 *
 * Lightweight HTTP server liveness probe.
 * Note: This confirms the Express HTTP server process is responsive.
 * It is intentionally distinct from database connectivity checks,
 * so external orchestrators can test server health independently of DB state.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'ApplyFlow API is running',
  })
})

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
  })
})
