import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createApplicationSchema,
  updateApplicationSchema,
} from '../validations/application.js'

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
 * GET /api/applications/:id
 * Returns a single application owned by the authenticated user.
 */
applicationsRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Application ID is required',
        })
        return
      }

      const userId = req.user!.id

      const application = await prisma.application.findFirst({
        where: { id, userId },
      })

      if (!application) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Application not found',
        })
        return
      }

      res.status(200).json({
        application,
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

      // Prevent duplicate saves using sourceJobId when available
      if (data.sourceJobId) {
        const existing = await prisma.application.findFirst({
          where: {
            userId,
            sourceJobId: data.sourceJobId,
            ...(data.source ? { source: data.source } : {}),
          },
        })
        if (existing) {
          res.status(409).json({
            error: 'Conflict',
            message: 'This job listing is already saved in your tracker',
            application: existing,
          })
          return
        }
      }

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
          source: data.source?.trim() || null,
          sourceJobId: data.sourceJobId?.trim() || null,
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

/**
 * PATCH /api/applications/:id
 * Updates an existing application owned by the authenticated user.
 */
applicationsRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Application ID is required',
        })
        return
      }

      const userId = req.user!.id

      // 1. Ownership check: Must find existing record belonging strictly to this user
      const existing = await prisma.application.findFirst({
        where: { id, userId },
      })

      if (!existing) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Application not found',
        })
        return
      }

      // 2. Validate request body
      const parsed = updateApplicationSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid application update payload',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const data = parsed.data

      // 3. Cross-field salary boundary check against existing record
      const effectiveMinSalary = data.minSalary !== undefined ? data.minSalary : existing.minSalary
      const effectiveMaxSalary = data.maxSalary !== undefined ? data.maxSalary : existing.maxSalary

      if (
        effectiveMinSalary !== null &&
        effectiveMinSalary !== undefined &&
        effectiveMaxSalary !== null &&
        effectiveMaxSalary !== undefined &&
        effectiveMinSalary > effectiveMaxSalary
      ) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Minimum salary cannot exceed maximum salary',
          details: {
            maxSalary: ['Minimum salary cannot exceed maximum salary'],
          },
        })
        return
      }

      // 4. Construct update payload ensuring omitted fields are untouched
      const updateData: Record<string, unknown> = {}

      if (data.company !== undefined) {
        updateData.company = data.company.trim()
      }
      if (data.jobTitle !== undefined) {
        updateData.jobTitle = data.jobTitle.trim()
      } else if (data.role !== undefined) {
        updateData.jobTitle = data.role.trim()
      }
      if (data.status !== undefined) {
        updateData.status = data.status
      }
      if (data.location !== undefined) {
        updateData.location = data.location?.trim() || null
      }
      if (data.workplaceType !== undefined) {
        updateData.workplaceType = data.workplaceType
      }
      if (data.employmentType !== undefined) {
        updateData.employmentType = data.employmentType
      }
      if (data.jobUrl !== undefined) {
        updateData.jobUrl = data.jobUrl?.trim() || null
      }
      if (data.minSalary !== undefined) {
        updateData.minSalary = data.minSalary
      }
      if (data.maxSalary !== undefined) {
        updateData.maxSalary = data.maxSalary
      }
      if (data.salary !== undefined) {
        updateData.salary = data.salary?.trim() || null
      }
      if (data.source !== undefined) {
        updateData.source = data.source?.trim() || null
      }
      if (data.sourceJobId !== undefined) {
        updateData.sourceJobId = data.sourceJobId?.trim() || null
      }
      if (data.appliedAt !== undefined) {
        updateData.appliedAt = data.appliedAt ? new Date(data.appliedAt) : null
      }
      if (data.followUpDate !== undefined) {
        updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes?.trim() || null
      }

      // 5. Update application in database
      const application = await prisma.application.update({
        where: { id },
        data: updateData,
      })

      res.status(200).json({
        application,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * DELETE /api/applications/:id
 * Deletes an existing application owned by the authenticated user.
 */
applicationsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Application ID is required',
        })
        return
      }

      const userId = req.user!.id

      // 1. Ownership check: Must find existing record belonging strictly to this user
      const existing = await prisma.application.findFirst({
        where: { id, userId },
      })

      if (!existing) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Application not found',
        })
        return
      }

      // 2. Delete application (cascades automatically to child records)
      await prisma.application.delete({
        where: { id },
      })

      res.status(200).json({
        message: 'Application deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }
)

