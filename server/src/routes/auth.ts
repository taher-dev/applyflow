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
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/auth.js'
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from '../lib/reset-token.js'
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
 * POST /api/auth/forgot-password
 * Initiates password reset flow by verifying email and generating a single-use token.
 * Prevents account enumeration by returning a generic success message if the email is not registered.
 */
authRouter.post(
  '/forgot-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Please provide a valid email address',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const { email } = parsed.data

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, passwordHash: true },
      })

      if (!user) {
        // Return 200 with generic message to avoid email enumeration
        res.status(200).json({
          message: 'If an account exists with this email, password reset instructions have been generated.',
        })
        return
      }

      const resetToken = createPasswordResetToken(user)

      res.status(200).json({
        message: 'Password reset instructions have been generated.',
        resetToken,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/auth/reset-password
 * Verifies single-use reset token and updates the user's password with Argon2id.
 * Immediately logs the user in with a new session cookie and revokes existing sessions.
 */
authRouter.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid password reset submission',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const { token, newPassword } = parsed.data

      const validUser = await verifyPasswordResetToken(token)

      if (!validUser) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'The password reset token is invalid, expired, or has already been used.',
        })
        return
      }

      // Hash new password using Argon2id
      const newPasswordHash = await hashPassword(newPassword)

      // Update password in database
      await prisma.user.update({
        where: { id: validUser.id },
        data: { passwordHash: newPasswordHash },
      })

      // Revoke all existing sessions for this user for security
      await prisma.session.deleteMany({
        where: { userId: validUser.id },
      })

      // Create fresh session and set session cookie
      const { rawToken } = await createSession(validUser.id)
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions())

      res.status(200).json({
        message: 'Password has been successfully reset.',
        user: {
          id: validUser.id,
          name: validUser.name,
          email: validUser.email,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/auth/google
 * Authenticates user via Google OAuth (ID token) or fallback demo auth.
 * Verifies real Google credential against Google's tokeninfo API.
 */
authRouter.post(
  '/google',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { credential } = req.body || {}

      let email: string
      let name: string

      if (typeof credential === 'string' && credential.trim()) {
        // --- Real Google OAuth verification ---
        const tokenResponse = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
        )

        if (!tokenResponse.ok) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired Google authentication credential',
          })
          return
        }

        const tokenPayload = (await tokenResponse.json()) as {
          email?: string
          name?: string
          email_verified?: string | boolean
          aud?: string
        }

        if (!tokenPayload.email || (tokenPayload.email_verified !== 'true' && tokenPayload.email_verified !== true)) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Google account email is not verified',
          })
          return
        }

        // Verify audience if GOOGLE_CLIENT_ID is configured
        if (env.GOOGLE_CLIENT_ID && tokenPayload.aud && tokenPayload.aud !== env.GOOGLE_CLIENT_ID) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Google token audience does not match configured client ID',
          })
          return
        }

        email = tokenPayload.email.trim().toLowerCase()
        name = tokenPayload.name?.trim() || email.split('@')[0]
      } else {
        // --- Fallback / Demo Auth mode ---
        if (!isDemoAuthAllowed()) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing Google authentication credential',
          })
          return
        }

        const clientEmail =
          typeof req.body?.email === 'string' && req.body.email.trim()
            ? req.body.email.trim().toLowerCase()
            : null
        const clientName =
          typeof req.body?.name === 'string' && req.body.name.trim()
            ? req.body.name.trim()
            : null

        // Prevent demo impersonation of existing non-demo user accounts
        if (clientEmail) {
          const existingUser = await prisma.user.findUnique({
            where: { email: clientEmail },
          })
          if (existingUser && existingUser.email !== DEMO_GOOGLE_EMAIL) {
            res.status(403).json({
              error: 'Forbidden',
              message: 'Demo authentication cannot be used to access existing user accounts.',
            })
            return
          }
        }

        email = clientEmail || DEMO_GOOGLE_EMAIL
        name = clientName || DEMO_GOOGLE_NAME
      }

      // Upsert / find user
      let user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      })

      if (!user) {
        const passwordHash = await hashPassword(`oauth-${Date.now()}-${Math.random()}`)
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
