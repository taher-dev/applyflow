import crypto from 'node:crypto'
import type { CookieOptions } from 'express'
import { prisma } from './prisma.js'
import { env } from '../config/env.js'
import type { AuthUser } from '../types/auth.js'

export const SESSION_COOKIE_NAME = 'applyflow_session'

// 7 days expiration in milliseconds
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Generates a cryptographically secure 256-bit random session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Computes the SHA-256 hash of a session token for secure database storage.
 * Only the hash is stored in PostgreSQL; the raw token is only held in the user's cookie.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Returns standard cookie configuration for session persistence.
 */
export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  }
}

/**
 * Returns cookie options for clearing the session cookie upon logout.
 * Omits maxAge to adhere to Express cookie clearing standards.
 */
export function getClearSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  }
}

/**
 * Creates a new session in PostgreSQL for the specified user and returns the raw token.
 */
export async function createSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSessionToken()
  const tokenHash = hashSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { rawToken, expiresAt }
}

/**
 * Validates a session token by hashing it and looking it up in PostgreSQL.
 * If expired or not found, cleans up and returns null.
 */
export async function validateSessionToken(rawToken: string): Promise<{ user: AuthUser; expiresAt: Date } | null> {
  const tokenHash = hashSessionToken(rawToken)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  // Check if session has expired
  if (session.expiresAt.getTime() <= Date.now()) {
    // Delete expired session asynchronously
    prisma.session.delete({ where: { tokenHash } }).catch(() => {})
    return null
  }

  return {
    user: session.user,
    expiresAt: session.expiresAt,
  }
}

/**
 * Revokes a session by deleting it from PostgreSQL.
 */
export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = hashSessionToken(rawToken)
  await prisma.session.deleteMany({
    where: { tokenHash },
  })
}
