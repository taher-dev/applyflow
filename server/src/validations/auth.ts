import { z } from 'zod'

/**
 * Zod schema for user registration payload.
 * Enforces email normalization and sensible password length limits.
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or fewer'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be 128 characters or fewer'),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Zod schema for user login payload.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(128, 'Password must be 128 characters or fewer'),
})

export type LoginInput = z.infer<typeof loginSchema>
