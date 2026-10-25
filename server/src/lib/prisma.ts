import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

/**
 * Singleton PrismaClient instance.
 * Reuses the existing client in development across hot reloads to avoid exhausting connection pools.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// In both local development and serverless runtime (e.g. Vercel),
// cache PrismaClient on globalThis to reuse connections across warm invocations.
globalForPrisma.prisma = prisma

