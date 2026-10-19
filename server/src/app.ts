import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'
import { applicationsRouter } from './routes/applications.js'
import { notFoundHandler } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

/**
 * Express application factory/configuration.
 * Separated from server.ts to enable testing without binding to network ports.
 */
export const app = express()

// Security & Parsing Middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Request body parser with a defensive size limit to prevent payload attacks
app.use(express.json({ limit: '100kb' }))

// Mount API routes
app.use('/api', healthRouter)
app.use('/api/applications', applicationsRouter)

// Fallback 404 handler for any unmapped route
app.use(notFoundHandler)

// Centralized error handler (must be registered last)
app.use(errorHandler)
