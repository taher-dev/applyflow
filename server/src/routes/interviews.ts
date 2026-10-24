import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createInterviewSchema,
  updateInterviewSchema,
} from '../validations/interview.js'

export const interviewsRouter = Router()

// Protect all interview routes with authentication boundary
interviewsRouter.use(requireAuth)

/**
 * GET /api/interviews
 * Returns all interviews belonging to applications owned by the authenticated user.
 * Sorted chronologically by scheduled date (soonest first).
 */
interviewsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id

      const interviews = await prisma.interview.findMany({
        where: {
          application: {
            userId,
          },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          application: {
            select: {
              id: true,
              company: true,
              jobTitle: true,
              status: true,
            },
          },
        },
      })

      res.status(200).json({
        interviews,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/interviews/:id
 * Returns a single interview owned by the authenticated user.
 */
interviewsRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Interview ID is required',
        })
        return
      }

      const userId = req.user!.id

      const interview = await prisma.interview.findFirst({
        where: {
          id,
          application: {
            userId,
          },
        },
        include: {
          application: {
            select: {
              id: true,
              company: true,
              jobTitle: true,
              status: true,
            },
          },
        },
      })

      if (!interview) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Interview not found',
        })
        return
      }

      res.status(200).json({
        interview,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/interviews
 * Creates a new interview for an application owned by the authenticated user.
 * Strictly verifies ownership of the parent application before creation.
 */
interviewsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createInterviewSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid interview data',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const userId = req.user!.id
      const { applicationId, scheduledAt, type, locationOrLink, interviewer, notes } =
        parsed.data

      // Ownership enforcement: Verify that the parent application exists and belongs to req.user
      const application = await prisma.application.findFirst({
        where: {
          id: applicationId,
          userId,
        },
      })

      if (!application) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Target application not found or access denied',
        })
        return
      }

      const interview = await prisma.interview.create({
        data: {
          applicationId,
          scheduledAt,
          type,
          locationOrLink,
          interviewer,
          notes,
        },
        include: {
          application: {
            select: {
              id: true,
              company: true,
              jobTitle: true,
              status: true,
            },
          },
        },
      })

      res.status(201).json({
        interview,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * PATCH /api/interviews/:id
 * Updates an interview owned by the authenticated user.
 * Preserves omitted fields and verifies ownership if applicationId is updated.
 */
interviewsRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Interview ID is required',
        })
        return
      }

      const parsed = updateInterviewSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid update payload',
          details: parsed.error.flatten().fieldErrors,
        })
        return
      }

      const userId = req.user!.id

      // Verify that the interview exists and belongs to the authenticated user
      const existingInterview = await prisma.interview.findFirst({
        where: {
          id,
          application: {
            userId,
          },
        },
      })

      if (!existingInterview) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Interview not found',
        })
        return
      }

      // If applicationId is changing, verify that the new target application belongs to this user
      if (
        parsed.data.applicationId &&
        parsed.data.applicationId !== existingInterview.applicationId
      ) {
        const targetApp = await prisma.application.findFirst({
          where: {
            id: parsed.data.applicationId,
            userId,
          },
        })

        if (!targetApp) {
          res.status(404).json({
            error: 'Not Found',
            message: 'Target application not found or access denied',
          })
          return
        }
      }

      const updatedInterview = await prisma.interview.update({
        where: { id },
        data: parsed.data,
        include: {
          application: {
            select: {
              id: true,
              company: true,
              jobTitle: true,
              status: true,
            },
          },
        },
      })

      res.status(200).json({
        interview: updatedInterview,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * DELETE /api/interviews/:id
 * Deletes an interview owned by the authenticated user.
 */
interviewsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
      if (!id) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Interview ID is required',
        })
        return
      }

      const userId = req.user!.id

      // Verify that the interview exists and belongs to this user
      const existingInterview = await prisma.interview.findFirst({
        where: {
          id,
          application: {
            userId,
          },
        },
      })

      if (!existingInterview) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Interview not found',
        })
        return
      }

      await prisma.interview.delete({
        where: { id },
      })

      res.status(200).json({
        message: 'Interview deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }
)
