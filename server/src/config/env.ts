import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'
import { z } from 'zod'

// Attempt to load .env.local and .env from project root or server directory
const rootDir = path.resolve(import.meta.dirname, '../../../')
const serverDir = path.resolve(import.meta.dirname, '../../')

const envFiles = [
  path.join(rootDir, '.env.local'),
  path.join(rootDir, '.env'),
  path.join(serverDir, '.env.local'),
  path.join(serverDir, '.env'),
]

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file })
  }
}

// Fallback to default dotenv lookup
dotenv.config()

// Ensure DATABASE_URL_UNPOOLED defaults to DATABASE_URL if not explicitly provided
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL
}

// Automatically detect test runner environment to isolate tests from development data
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test')) ||
  process.execArgv.some((arg) => arg.includes('test'))

if (isTestEnvironment) {
  process.env.NODE_ENV = 'test'
  if (!process.env.TEST_DATABASE_URL && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('applyflow_dev'))) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/applyflow_test?schema=public'
    process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL
  }
}

/**
 * Strict runtime validation schema for server environment variables.
 * Ensures the server fails fast with actionable errors if misconfigured.
 */
const envSchema = z
  .object({
    PORT: z
      .string()
      .default('5000')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
        message: 'PORT must be a valid port number between 1 and 65535',
      }),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    DATABASE_URL: z
      .string()
      .default('postgresql://postgres:postgres@localhost:5432/applyflow_dev?schema=public'),
    ENABLE_DEMO_AUTH: z
      .string()
      .optional()
      .default('true')
      .transform((val) => val === 'true' || val === '1'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('ApplyFlow <no-reply@applyflow.app>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 587)),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
    APP_URL: z.string().optional(),
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid server environment configuration:')
  console.error(parsed.error.format())
  throw new Error('Server environment validation failed. Check your environment variables or .env file.')
}

export const env = parsed.data
export type ServerEnv = z.infer<typeof envSchema>

/**
 * Determines whether Google demo authentication is allowed.
 * Enabled by default unless explicitly disabled with ENABLE_DEMO_AUTH=false.
 */
export function isDemoAuthAllowed(): boolean {
  if (process.env.ENABLE_DEMO_AUTH !== undefined) {
    return process.env.ENABLE_DEMO_AUTH === 'true' || process.env.ENABLE_DEMO_AUTH === '1'
  }
  return env.ENABLE_DEMO_AUTH === true
}
