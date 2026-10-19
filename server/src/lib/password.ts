import { hash, verify } from '@node-rs/argon2'

/**
 * Modern Argon2id password hashing parameters.
 * Follows OWASP recommendations: memoryCost 19456 KiB (19 MiB), 2 iterations.
 */
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
}

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS)
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 * Returns false on mismatch or malformed hash without leaking timing info.
 */
export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password)
  } catch {
    return false
  }
}
