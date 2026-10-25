/**
 * Authenticated user context attached to Express requests.
 */
export interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
