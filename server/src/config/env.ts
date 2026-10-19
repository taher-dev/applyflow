import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file if present
dotenv.config()

// Automatically detect test runner environment to isolate tests from development data
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test')) ||
  process.execArgv.some((arg) => arg.includes('test'))

if (isTestEnvironment) {
  process.env.NODE_ENV = 'test'
  if (!process.env.TEST_DATABASE_URL && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('applyflow_dev'))) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/applyflow_test?schema=public'
  }
}

/**
 * Strict runtime validation schema for server environment variables.
 * Ensures the server fails fast with actionable errors if misconfigured.
 */
const envSchema = z.object({
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
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid server environment configuration:')
  console.error(parsed.error.format())
  throw new Error('Server environment validation failed. Check your environment variables or .env file.')
}

export const env = parsed.data
export type ServerEnv = z.infer<typeof envSchema>
