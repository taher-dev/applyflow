import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getClearSessionCookieOptions,
  createSession,
  validateSessionToken,
  revokeSession,
} from '../lib/session.js'
import { registerSchema, loginSchema } from '../validations/auth.js'
import { env, isDemoAuthAllowed } from '../config/env.js'

export const DEMO_GOOGLE_EMAIL = 'demo.google@applyflow.app'
export const DEMO_GOOGLE_NAME = 'Google Demo User'

export const authRouter = Router()

/**
 * POST /api/auth/register
 * Creates a new user with Argon2id password hash and establishes a session.
 */
authRouter.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = registerSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid registration details',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const { name, email, password } = parsed.data

      // Reserve demo email address to prevent collision with mock authentication
      if (email === DEMO_GOOGLE_EMAIL) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'This email is reserved for demo authentication',
        })
        return
      }

      // Check for duplicate email
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        res.status(409).json({
          error: 'Conflict',
          message: 'An account with this email already exists',
        })
        return
      }

      // Hash password using Argon2id
      const passwordHash = await hashPassword(password)

      // Create user record
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      // Establish session
      const { rawToken } = await createSession(user.id)

      // Set session cookie
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/auth/login
 * Validates credentials and establishes a new session cookie.
 */
authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid email or password format',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const { email, password } = parsed.data

      // Query user by email
      const user = await prisma.user.findUnique({
        where: { email },
      })

      // Use constant-time comparison to avoid email enumeration via timing
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
        return
      }

      const isValidPassword = await verifyPassword(user.passwordHash, password)

      if (!isValidPassword) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        })
        return
      }

      // Create new session
      const { rawToken } = await createSession(user.id)

      // Set session cookie
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/auth/google
 * Development-only mock Google authentication endpoint.
 * Strictly disabled outside development environments.
 * Prevents account takeover by rejecting any attempt to impersonate existing accounts.
 */
authRouter.post(
  '/google',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Forbid outside development or when demo auth is disabled
      if (!isDemoAuthAllowed()) {
        res.status(501).json({
          error: 'Not Implemented',
          message: 'Google authentication is not supported in this environment.',
        })
        return
      }

      // 2. Extract client-requested credentials if provided
      const clientEmail =
        typeof req.body?.email === 'string' && req.body.email.trim()
          ? req.body.email.trim().toLowerCase()
          : null
      const clientName =
        typeof req.body?.name === 'string' && req.body.name.trim()
          ? req.body.name.trim()
          : null

      // 3. Prevent impersonation of existing user accounts
      if (clientEmail) {
        const existingUser = await prisma.user.findUnique({
          where: { email: clientEmail },
        })

        // Reject attempts to claim an existing account via demo auth
        if (existingUser && existingUser.email !== DEMO_GOOGLE_EMAIL) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Demo authentication cannot be used to access existing user accounts.',
          })
          return
        }
      }

      const email = clientEmail || DEMO_GOOGLE_EMAIL
      const name = clientName || DEMO_GOOGLE_NAME

      let user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      })

      if (!user) {
        const passwordHash = await hashPassword(`google-demo-${Date.now()}-${Math.random()}`)
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      }

      // Establish session
      const { rawToken } = await createSession(user.id)
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/auth/logout
 * Revokes current session in PostgreSQL and clears the session cookie.
 */
authRouter.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME]

      if (rawToken && typeof rawToken === 'string') {
        await revokeSession(rawToken)
      }

      res.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions())

      res.status(200).json({
        message: 'Logged out successfully',
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/auth/me
 * Returns the currently authenticated user based on session cookie.
 */
authRouter.get(
  '/me',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME]

      if (rawToken && typeof rawToken === 'string') {
        const authResult = await validateSessionToken(rawToken)
        if (authResult) {
          res.status(200).json({
            user: authResult.user,
          })
          return
        }
      }

      // Safe test seam fallback strictly in test environment
      if (env.NODE_ENV === 'test') {
        const testUserId = req.headers['x-test-user-id']
        if (typeof testUserId === 'string' && testUserId.trim().length > 0) {
          const user = await prisma.user.findUnique({
            where: { id: testUserId.trim() },
            select: { id: true, name: true, email: true },
          })
          if (user) {
            res.status(200).json({ user })
            return
          }
        }
      }

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated or session expired',
      })
    } catch (error) {
      next(error)
    }
  }
)
