import crypto from 'node:crypto'
import { prisma } from './prisma.js'

// Token validity duration (1 hour)
export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000

interface ResetTokenPayload {
  uid: string
  email: string
  exp: number
}

/**
 * Derives a key for HMAC signing using a system salt and the user's current password hash.
 * This guarantees that as soon as the user's password changes, any previously issued
 * reset tokens become immediately and permanently invalid (single-use guarantee).
 */
function deriveHmacKey(passwordHash: string): Buffer {
  const secret = process.env.AUTH_SECRET || 'applyflow-auth-secret-salt-2026'
  return crypto.createHash('sha256').update(`${secret}:${passwordHash}`).digest()
}

/**
 * Creates a cryptographically signed password reset token for the given user.
 */
export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string }): string {
  const payload: ResetTokenPayload = {
    uid: user.id,
    email: user.email.toLowerCase(),
    exp: Date.now() + RESET_TOKEN_EXPIRY_MS,
  }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmacKey = deriveHmacKey(user.passwordHash)
  const signature = crypto.createHmac('sha256', hmacKey).update(payloadStr).digest('base64url')

  return `${payloadStr}.${signature}`
}

/**
 * Verifies a password reset token:
 * 1. Validates structure and base64 decoding.
 * 2. Checks token expiration.
 * 3. Retrieves the user from the database.
 * 4. Recomputes and verifies the cryptographic HMAC signature using the user's current password hash.
 *
 * Returns the matching user if valid and not expired; returns null otherwise.
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ id: string; email: string; name: string } | null> {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }

    const parts = token.trim().split('.')
    if (parts.length !== 2) {
      return null
    }

    const [payloadStr, signature] = parts
    if (!payloadStr || !signature) {
      return null
    }

    const payloadJson = Buffer.from(payloadStr, 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson) as ResetTokenPayload

    if (!payload.uid || !payload.email || typeof payload.exp !== 'number') {
      return null
    }

    // Check expiration
    if (Date.now() > payload.exp) {
      return null
    }

    // Retrieve user by ID
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    })

    if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
      return null
    }

    // Verify cryptographic signature
    const hmacKey = deriveHmacKey(user.passwordHash)
    const expectedSignature = crypto.createHmac('sha256', hmacKey).update(payloadStr).digest('base64url')

    const sigBuffer = Buffer.from(signature)
    const expectedSigBuffer = Buffer.from(expectedSignature)

    if (sigBuffer.length !== expectedSigBuffer.length) {
      return null
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  } catch {
    return null
  }
}
