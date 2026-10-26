import path from 'node:path'
import fs from 'node:fs'
import net from 'node:net'
import { execSync } from 'node:child_process'
import EmbeddedPostgres from 'embedded-postgres'
import { prisma } from './prisma.js'

let embeddedInstance: InstanceType<typeof EmbeddedPostgres> | null = null

/**
 * Checks if a TCP port is open and accepting connections.
 */
function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    const done = (isOpen: boolean) => {
      if (resolved) return
      resolved = true
      socket.destroy()
      resolve(isOpen)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

/**
 * Tests if Prisma can successfully query the database.
 */
async function canPrismaConnect(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Ensures a PostgreSQL instance is running and databases/tables are ready.
 * 1. Checks if PostgreSQL is already running on port 5432 (e.g., via Docker or system service).
 * 2. If not running, launches embedded PostgreSQL automatically.
 * 3. Ensures 'applyflow_dev' and 'applyflow_test' databases exist.
 * 4. Ensures Prisma migrations are applied.
 */
export async function ensureDatabase(): Promise<void> {
  const port = 5432
  const isRunning = await isPortOpen(port)

  if (isRunning) {
    const connected = await canPrismaConnect()
    if (connected) {
      console.log('✅ PostgreSQL is running and connected on port 5432.')
      return
    }
  }

  console.log('🐘 PostgreSQL is not reachable on port 5432. Launching embedded PostgreSQL...')

  const serverDir = path.resolve(import.meta.dirname, '../..')
  const dbDir = path.resolve(serverDir, 'data/db')

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  embeddedInstance = new EmbeddedPostgres({
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    databaseDir: dbDir,
    persistent: true,
  })

  const pgVersionFile = path.join(dbDir, 'PG_VERSION')
  if (!fs.existsSync(pgVersionFile)) {
    console.log('📦 Initializing local database cluster...')
    await embeddedInstance.initialise()
  }

  await embeddedInstance.start()
  console.log('🚀 Local PostgreSQL server started on port 5432.')

  // Ensure dev and test databases exist
  try {
    await embeddedInstance.createDatabase('applyflow_dev')
  } catch {
    // Already exists
  }
  try {
    await embeddedInstance.createDatabase('applyflow_test')
  } catch {
    // Already exists
  }

  // Ensure migrations are deployed
  try {
    console.log('🔄 Checking database migrations...')
    execSync('npx prisma migrate deploy', {
      cwd: serverDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/applyflow_dev?schema=public',
        DATABASE_URL_UNPOOLED: 'postgresql://postgres:postgres@localhost:5432/applyflow_dev?schema=public',
      },
    })
    console.log('✅ Database migrations up-to-date.')
  } catch (err) {
    console.warn('⚠️ Migration deployment notice:', (err as Error).message)
  }
}

/**
 * Gracefully shuts down embedded PostgreSQL if it was started by this process.
 */
export async function stopDatabase(): Promise<void> {
  if (embeddedInstance) {
    try {
      console.log('🛑 Stopping local PostgreSQL...')
      await embeddedInstance.stop()
      console.log('✅ Local PostgreSQL stopped.')
    } catch (err) {
      console.error('Error stopping PostgreSQL:', err)
    } finally {
      embeddedInstance = null
    }
  }
}
