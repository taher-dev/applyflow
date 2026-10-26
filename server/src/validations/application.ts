import { z } from 'zod'
import {
  ApplicationStatus,
  WorkplaceType,
  EmploymentType,
} from '@prisma/client'

// Status normalization map supporting both Prisma UPPERCASE and frontend PascalCase
const statusMap: Record<string, ApplicationStatus> = {
  SAVED: ApplicationStatus.SAVED,
  Saved: ApplicationStatus.SAVED,
  APPLIED: ApplicationStatus.APPLIED,
  Applied: ApplicationStatus.APPLIED,
  SCREENING: ApplicationStatus.SCREENING,
  Screening: ApplicationStatus.SCREENING,
  INTERVIEW: ApplicationStatus.INTERVIEW,
  Interview: ApplicationStatus.INTERVIEW,
  OFFER: ApplicationStatus.OFFER,
  Offer: ApplicationStatus.OFFER,
  REJECTED: ApplicationStatus.REJECTED,
  Rejected: ApplicationStatus.REJECTED,
  ACTIVE: ApplicationStatus.APPLIED,
  Active: ApplicationStatus.APPLIED,
}

// Workplace type normalization map
const workplaceMap: Record<string, WorkplaceType> = {
  REMOTE: WorkplaceType.REMOTE,
  Remote: WorkplaceType.REMOTE,
  HYBRID: WorkplaceType.HYBRID,
  Hybrid: WorkplaceType.HYBRID,
  ON_SITE: WorkplaceType.ON_SITE,
  'On-site': WorkplaceType.ON_SITE,
  ONSITE: WorkplaceType.ON_SITE,
}

// Employment type normalization map
const employmentMap: Record<string, EmploymentType> = {
  FULL_TIME: EmploymentType.FULL_TIME,
  'Full-time': EmploymentType.FULL_TIME,
  PART_TIME: EmploymentType.PART_TIME,
  'Part-time': EmploymentType.PART_TIME,
  CONTRACT: EmploymentType.CONTRACT,
  Contract: EmploymentType.CONTRACT,
  INTERNSHIP: EmploymentType.INTERNSHIP,
  Internship: EmploymentType.INTERNSHIP,
}

/**
 * Zod validation schema for creating an application.
 * Accepts both backend enum formats and frontend display values,
 * transforming them cleanly into Prisma-compatible types.
 */
export const createApplicationSchema = z
  .object({
    company: z.string({ required_error: 'Company name is required' }).trim().min(1, 'Company name is required'),
    jobTitle: z.string().trim().min(1, 'Job title is required').optional(),
    role: z.string().trim().min(1, 'Role is required').optional(),
    status: z
      .string()
      .optional()
      .default('SAVED')
      .refine((val) => val in statusMap, {
        message: 'Invalid application status. Allowed: Saved, Applied, Screening, Interview, Offer, Rejected',
      })
      .transform((val) => statusMap[val]),
    location: z.string().trim().optional().nullable(),
    workplaceType: z
      .string()
      .optional()
      .default('REMOTE')
      .refine((val) => val in workplaceMap, {
        message: 'Invalid workplace type. Allowed: Remote, Hybrid, On-site',
      })
      .transform((val) => workplaceMap[val]),
    employmentType: z
      .string()
      .optional()
      .nullable()
      .refine((val) => val === null || val === undefined || val === '' || val in employmentMap, {
        message: 'Invalid employment type. Allowed: Full-time, Part-time, Contract, Internship',
      })
      .transform((val) => (val && val in employmentMap ? employmentMap[val] : null)),
    jobUrl: z
      .string()
      .trim()
      .url('Job URL must be a valid URL')
      .optional()
      .nullable()
      .or(z.literal('')),
    minSalary: z
      .number({ invalid_type_error: 'Minimum salary must be a number' })
      .int('Minimum salary must be an integer')
      .min(0, 'Minimum salary must be 0 or greater')
      .optional()
      .nullable(),
    maxSalary: z
      .number({ invalid_type_error: 'Maximum salary must be a number' })
      .int('Maximum salary must be an integer')
      .min(0, 'Maximum salary must be 0 or greater')
      .optional()
      .nullable(),
    salary: z.string().trim().optional().nullable(),
    source: z.string().trim().max(100).optional().nullable(),
    sourceJobId: z.string().trim().max(100).optional().nullable(),
    appliedAt: z
      .string()
      .datetime({ message: 'appliedAt must be a valid ISO 8601 date string' })
      .optional()
      .nullable()
      .or(z.literal('')),
    followUpDate: z
      .string()
      .datetime({ message: 'followUpDate must be a valid ISO 8601 date string' })
      .optional()
      .nullable()
      .or(z.literal('')),
    notes: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      // Ensure either jobTitle or role is provided
      const title = data.jobTitle || data.role
      return !!title && title.trim().length > 0
    },
    {
      message: 'Job title is required',
      path: ['jobTitle'],
    }
  )
  .refine(
    (data) => {
      // Salary boundary validation
      if (
        data.minSalary !== undefined &&
        data.minSalary !== null &&
        data.maxSalary !== undefined &&
        data.maxSalary !== null
      ) {
        return data.minSalary <= data.maxSalary
      }
      return true
    },
    {
      message: 'Minimum salary cannot exceed maximum salary',
      path: ['maxSalary'],
    }
  )

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

/**
 * Zod validation schema for updating an application (PATCH).
 * All fields are optional. Any provided field is validated and normalized.
 */
export const updateApplicationSchema = z
  .object({
    company: z.string().trim().min(1, 'Company name cannot be empty').optional(),
    jobTitle: z.string().trim().min(1, 'Job title cannot be empty').optional(),
    role: z.string().trim().min(1, 'Role cannot be empty').optional(),
    status: z
      .string()
      .optional()
      .refine((val) => val === undefined || val in statusMap, {
        message: 'Invalid application status. Allowed: Saved, Applied, Screening, Interview, Offer, Rejected',
      })
      .transform((val) => (val !== undefined ? statusMap[val] : undefined)),
    location: z.string().trim().optional().nullable(),
    workplaceType: z
      .string()
      .optional()
      .refine((val) => val === undefined || val in workplaceMap, {
        message: 'Invalid workplace type. Allowed: Remote, Hybrid, On-site',
      })
      .transform((val) => (val !== undefined ? workplaceMap[val] : undefined)),
    employmentType: z
      .string()
      .optional()
      .nullable()
      .refine((val) => val === null || val === undefined || val === '' || val in employmentMap, {
        message: 'Invalid employment type. Allowed: Full-time, Part-time, Contract, Internship',
      })
      .transform((val) => (val && val in employmentMap ? employmentMap[val] : val === null || val === '' ? null : undefined)),
    jobUrl: z
      .string()
      .trim()
      .url('Job URL must be a valid URL')
      .optional()
      .nullable()
      .or(z.literal('')),
    minSalary: z
      .number({ invalid_type_error: 'Minimum salary must be a number' })
      .int('Minimum salary must be an integer')
      .min(0, 'Minimum salary must be 0 or greater')
      .optional()
      .nullable(),
    maxSalary: z
      .number({ invalid_type_error: 'Maximum salary must be a number' })
      .int('Maximum salary must be an integer')
      .min(0, 'Maximum salary must be 0 or greater')
      .optional()
      .nullable(),
    salary: z.string().trim().optional().nullable(),
    source: z.string().trim().max(100).optional().nullable(),
    sourceJobId: z.string().trim().max(100).optional().nullable(),
    appliedAt: z
      .string()
      .datetime({ message: 'appliedAt must be a valid ISO 8601 date string' })
      .optional()
      .nullable()
      .or(z.literal('')),
    followUpDate: z
      .string()
      .datetime({ message: 'followUpDate must be a valid ISO 8601 date string' })
      .optional()
      .nullable()
      .or(z.literal('')),
    notes: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.minSalary !== undefined &&
        data.minSalary !== null &&
        data.maxSalary !== undefined &&
        data.maxSalary !== null
      ) {
        return data.minSalary <= data.maxSalary
      }
      return true
    },
    {
      message: 'Minimum salary cannot exceed maximum salary',
      path: ['maxSalary'],
    }
  )

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
