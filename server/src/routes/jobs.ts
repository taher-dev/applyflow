import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { jobService } from '../services/jobs/jobService.js'

export const jobsRouter = Router()

const jobSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search keyword cannot exceed 100 characters')
    .optional()
    .default(''),
  keyword: z.string().trim().max(100).optional(),
  location: z
    .string()
    .trim()
    .max(100, 'Location filter cannot exceed 100 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  employmentType: z
    .string()
    .trim()
    .max(50, 'Employment type cannot exceed 50 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  category: z
    .string()
    .trim()
    .max(100, 'Category cannot exceed 100 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  experience: z
    .string()
    .trim()
    .max(50, 'Experience filter cannot exceed 50 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  workplaceType: z
    .string()
    .trim()
    .max(50, 'Workplace type cannot exceed 50 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  postedWithin: z
    .string()
    .trim()
    .max(20, 'Posted within filter cannot exceed 20 characters')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  hasSalary: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  sortBy: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  page: z
    .coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(100, 'Page cannot exceed 100')
    .optional()
    .default(1),
  pageSize: z
    .coerce
    .number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(30, 'Page size cannot exceed 30')
    .optional()
    .default(15),
  provider: z
    .string()
    .trim()
    .max(30)
    .optional()
    .default('bdjobs'),
})

/**
 * GET /api/jobs/search
 * Publicly accessible job search endpoint across registered providers (BDJobs).
 * Does not require authentication, honoring guest-first usage.
 */
jobsRouter.get(
  '/search',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = jobSearchQuerySchema.safeParse(req.query)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid job search query parameters',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const {
        q,
        keyword,
        location,
        employmentType,
        category,
        experience,
        workplaceType,
        postedWithin,
        hasSalary,
        sortBy,
        page,
        pageSize,
        provider,
      } = parsed.data
      const effectiveQuery = (q || keyword || '').trim()

      const result = await jobService.searchJobs(provider, {
        query: effectiveQuery,
        location,
        employmentType,
        category,
        experience,
        workplaceType,
        postedWithin,
        hasSalary,
        sortBy,
        page,
        pageSize,
      })

      // If provider is not available or returned an error, return 200 with truthful metadata
      // so the UI can display the fallback search link and informative state
      res.status(200).json(result)
    } catch {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while searching for jobs',
      })
    }
  }
)

/**
 * GET /api/jobs/providers
 * Returns list of available job providers and their display metadata.
 */
jobsRouter.get(
  '/providers',
  (_req: Request, res: Response): void => {
    res.json({
      providers: jobService.getRegisteredProviders(),
    })
  }
)
