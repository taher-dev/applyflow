import { app } from './app.js'
import { env } from './config/env.js'
import { ensureDatabase, stopDatabase } from './lib/db.js'

async function bootstrap() {
  try {
    await ensureDatabase()

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 ApplyFlow API server running on port ${env.PORT} [${env.NODE_ENV}]`)
      console.log(`👉 Health check: http://localhost:${env.PORT}/api/health`)
    })

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down ApplyFlow server...`)
      server.close(async () => {
        console.log('HTTP server closed.')
        await stopDatabase()
        process.exit(0)
      })
    }

    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    await stopDatabase()
    process.exit(1)
  }
}

void bootstrap()

