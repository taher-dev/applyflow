import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, () => {
  console.log(`🚀 ApplyFlow API server running on port ${env.PORT} [${env.NODE_ENV}]`)
  console.log(`👉 Health check: http://localhost:${env.PORT}/api/health`)
})

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down ApplyFlow server...`)
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
