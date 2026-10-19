import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { createApplicationSchema } from '../validations/application.js'

export const applicationsRouter = Router()

// Protect all application routes with authentication boundary
applicationsRouter.use(requireAuth)

/**
 * GET /api/applications
 * Returns all job applications belonging to the authenticated user, newest first.
 */
applicationsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id

      const applications = await prisma.application.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      res.status(200).json({
        applications,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/applications
 * Creates a new job application for the authenticated user.
 */
applicationsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createApplicationSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid application payload',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const data = parsed.data
      const userId = req.user!.id
      const resolvedJobTitle = (data.jobTitle || data.role)!.trim()

      const application = await prisma.application.create({
        data: {
          userId,
          company: data.company.trim(),
          jobTitle: resolvedJobTitle,
          status: data.status,
          location: data.location?.trim() || null,
          workplaceType: data.workplaceType,
          employmentType: data.employmentType || null,
          jobUrl: data.jobUrl?.trim() || null,
          minSalary: data.minSalary ?? null,
          maxSalary: data.maxSalary ?? null,
          salary: data.salary?.trim() || null,
          appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          notes: data.notes?.trim() || null,
        },
      })

      res.status(201).json({
        application,
      })
    } catch (error) {
      next(error)
    }
  }
)
