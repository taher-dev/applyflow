import { z } from 'zod'
import { InterviewType } from '@prisma/client'

/**
 * Normalization map supporting both Prisma enum values and frontend display labels.
 */
export const interviewTypeMap: Record<string, InterviewType> = {
  PHONE_SCREENING: InterviewType.PHONE_SCREENING,
  'Phone screening': InterviewType.PHONE_SCREENING,
  VIDEO_INTERVIEW: InterviewType.VIDEO_INTERVIEW,
  'Video interview': InterviewType.VIDEO_INTERVIEW,
  TECHNICAL_INTERVIEW: InterviewType.TECHNICAL_INTERVIEW,
  'Technical interview': InterviewType.TECHNICAL_INTERVIEW,
  ON_SITE_INTERVIEW: InterviewType.ON_SITE_INTERVIEW,
  'On-site interview': InterviewType.ON_SITE_INTERVIEW,
  FINAL_INTERVIEW: InterviewType.FINAL_INTERVIEW,
  'Final interview': InterviewType.FINAL_INTERVIEW,
  OTHER: InterviewType.OTHER,
  'Other': InterviewType.OTHER,
}

const interviewTypeSchema = z
  .string()
  .trim()
  .refine((val) => val in interviewTypeMap, {
    message:
      'Invalid interview type. Allowed values: Phone screening, Video interview, Technical interview, On-site interview, Final interview, Other',
  })
  .transform((val) => interviewTypeMap[val])

const dateValidation = z
  .string({ required_error: 'Scheduled date and time is required' })
  .trim()
  .min(1, 'Scheduled date and time is required')
  .refine(
    (val) => {
      const parsed = new Date(val)
      return !isNaN(parsed.getTime())
    },
    { message: 'Invalid scheduled date and time format' }
  )
  .transform((val) => new Date(val))

/**
 * Helper schema for optional, nullable string fields.
 * If omitted (undefined), remains undefined so partial updates (PATCH) do not wipe existing values.
 * If null or empty string, normalizes to null.
 */
const optionalNullableString = (maxLen: number, maxMsg: string) =>
  z
    .string()
    .trim()
    .max(maxLen, maxMsg)
    .nullable()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined
      if (val === null || val.length === 0) return null
      return val
    })

const locationOrLinkSchema = optionalNullableString(500, 'Location or link must not exceed 500 characters')
const interviewerSchema = optionalNullableString(200, 'Interviewer name must not exceed 200 characters')
const notesSchema = optionalNullableString(5000, 'Notes must not exceed 5000 characters')

/**
 * Schema for creating a new interview.
 * Strictly ignores any client-supplied userId to prevent ownership spoofing.
 */
export const createInterviewSchema = z
  .object({
    applicationId: z
      .string({ required_error: 'Application ID is required' })
      .trim()
      .min(1, 'Application ID is required'),
    scheduledAt: dateValidation,
    type: interviewTypeSchema.optional().default('VIDEO_INTERVIEW'),
    interviewType: interviewTypeSchema.optional(),
    locationOrLink: locationOrLinkSchema,
    interviewer: interviewerSchema,
    notes: notesSchema,
    userId: z.unknown().optional(), // Strictly ignored/stripped
  })
  .transform((data) => {
    // Prefer interviewType if provided, otherwise type
    const resolvedType = data.interviewType ?? data.type ?? InterviewType.VIDEO_INTERVIEW
    return {
      applicationId: data.applicationId,
      scheduledAt: data.scheduledAt,
      type: resolvedType,
      locationOrLink: data.locationOrLink ?? null,
      interviewer: data.interviewer ?? null,
      notes: data.notes ?? null,
    }
  })

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>

/**
 * Schema for updating an existing interview.
 * All fields are optional to support partial updates.
 */
export const updateInterviewSchema = z
  .object({
    applicationId: z.string().trim().min(1, 'Application ID cannot be empty').optional(),
    scheduledAt: z
      .string()
      .trim()
      .min(1, 'Scheduled date and time cannot be empty')
      .refine(
        (val) => {
          const parsed = new Date(val)
          return !isNaN(parsed.getTime())
        },
        { message: 'Invalid scheduled date and time format' }
      )
      .transform((val) => new Date(val))
      .optional(),
    type: interviewTypeSchema.optional(),
    interviewType: interviewTypeSchema.optional(),
    locationOrLink: locationOrLinkSchema,
    interviewer: interviewerSchema,
    notes: notesSchema,
    userId: z.unknown().optional(), // Strictly ignored/stripped
  })
  .transform((data) => {
    const payload: {
      applicationId?: string
      scheduledAt?: Date
      type?: InterviewType
      locationOrLink?: string | null
      interviewer?: string | null
      notes?: string | null
    } = {}

    if (data.applicationId !== undefined) payload.applicationId = data.applicationId
    if (data.scheduledAt !== undefined) payload.scheduledAt = data.scheduledAt
    if (data.interviewType !== undefined) {
      payload.type = data.interviewType
    } else if (data.type !== undefined) {
      payload.type = data.type
    }
    if (data.locationOrLink !== undefined) payload.locationOrLink = data.locationOrLink
    if (data.interviewer !== undefined) payload.interviewer = data.interviewer
    if (data.notes !== undefined) payload.notes = data.notes

    return payload
  })

export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>
