import type {
  JobApplication,
  ApplicationStatus,
  WorkplaceType,
  EmploymentType,
  Interview,
  InterviewType,
} from '@/types/dashboard'
import type {
  BackendApplication,
  BackendApplicationStatus,
  BackendWorkplaceType,
  BackendEmploymentType,
  CreateApplicationPayload,
  UpdateApplicationPayload,
} from '@/types/application'
import type {
  BackendInterview,
  BackendInterviewType,
  CreateInterviewPayload,
  UpdateInterviewPayload,
} from '@/types/interview'

// --- Enum Mappings ---

export const STATUS_TO_BACKEND: Record<ApplicationStatus, BackendApplicationStatus> = {
  Active: 'APPLIED',
  Rejected: 'REJECTED',
  Offer: 'OFFER',
  Saved: 'SAVED',
  Applied: 'APPLIED',
  Screening: 'SCREENING',
  Interview: 'INTERVIEW',
}

export const STATUS_TO_FRONTEND: Record<string, ApplicationStatus> = {
  ACTIVE: 'Applied',
  Active: 'Applied',
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  // Defensive fallbacks for title-cased or legacy values
  Saved: 'Saved',
  Applied: 'Applied',
  Screening: 'Screening',
  Interview: 'Interview',
  Offer: 'Offer',
  Rejected: 'Rejected',
}

export const WORKPLACE_TO_BACKEND: Record<WorkplaceType, BackendWorkplaceType> = {
  Remote: 'REMOTE',
  Hybrid: 'HYBRID',
  'On-site': 'ON_SITE',
}

export const WORKPLACE_TO_FRONTEND: Record<string, WorkplaceType> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ON_SITE: 'On-site',
  Remote: 'Remote',
  Hybrid: 'Hybrid',
  'On-site': 'On-site',
}

export const EMPLOYMENT_TO_BACKEND: Record<EmploymentType, BackendEmploymentType> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACT',
  Internship: 'INTERNSHIP',
}

export const EMPLOYMENT_TO_FRONTEND: Record<string, EmploymentType> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  'Full-time': 'Full-time',
  'Part-time': 'Part-time',
  Contract: 'Contract',
  Internship: 'Internship',
}

// --- Date Normalization Utilities (Timezone Safe) ---

/**
 * Extracts a calendar YYYY-MM-DD date string without timezone skew.
 */
export function toDateOnlyString(dateValue?: string | Date | null): string {
  if (!dateValue) return ''

  if (typeof dateValue === 'string') {
    // If it's already YYYY-MM-DD or starts with YYYY-MM-DD
    const match = dateValue.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) {
      return match[1]
    }
    const parsed = new Date(dateValue)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
    return ''
  }

  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue.toISOString().slice(0, 10)
  }

  return ''
}

/**
 * Converts a frontend YYYY-MM-DD date string to a safe UTC ISO-8601 string for the backend.
 */
export function toBackendIsoDate(dateString?: string | null): string | null {
  if (!dateString) return null
  const trimmed = dateString.trim()
  if (!trimmed) return null

  // If it's already an ISO string with time
  if (trimmed.includes('T')) {
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  // Format YYYY-MM-DD into UTC midnight
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return `${trimmed}T00:00:00.000Z`
  }

  const parsed = new Date(trimmed)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

// --- Main Mapping Functions ---

/**
 * Maps a backend database application record to the frontend JobApplication interface.
 */
export function toFrontendApplication(backendApp: BackendApplication): JobApplication {
  const status = STATUS_TO_FRONTEND[backendApp.status] || 'Saved'
  const workplaceType = WORKPLACE_TO_FRONTEND[backendApp.workplaceType] || 'Remote'
  const employmentType = backendApp.employmentType
    ? EMPLOYMENT_TO_FRONTEND[backendApp.employmentType] || undefined
    : undefined

  // Compute appliedDate: prefer appliedAt, fallback to createdAt date
  const appliedDate =
    toDateOnlyString(backendApp.appliedAt) ||
    toDateOnlyString(backendApp.createdAt) ||
    new Date().toISOString().slice(0, 10)

  const followUpDate = toDateOnlyString(backendApp.followUpDate) || undefined

  return {
    id: backendApp.id,
    company: backendApp.company,
    role: backendApp.jobTitle,
    location: backendApp.location ?? undefined,
    workplaceType,
    employmentType,
    jobUrl: backendApp.jobUrl ?? undefined,
    source: backendApp.source ?? undefined,
    sourceJobId: backendApp.sourceJobId ?? undefined,
    minSalary: backendApp.minSalary ?? undefined,
    maxSalary: backendApp.maxSalary ?? undefined,
    salary: backendApp.salary ?? undefined,
    appliedDate,
    status,
    notes: backendApp.notes ?? undefined,
    followUpDate,
  }
}

/**
 * Maps a frontend application creation request to the backend CreateApplicationPayload.
 */
export function toBackendCreatePayload(
  app: Omit<JobApplication, 'id'> | JobApplication
): CreateApplicationPayload {
  const status = STATUS_TO_BACKEND[app.status] || 'SAVED'
  const workplaceType = WORKPLACE_TO_BACKEND[app.workplaceType] || 'REMOTE'
  const employmentType = app.employmentType
    ? EMPLOYMENT_TO_BACKEND[app.employmentType] || null
    : null

  const appliedAt = toBackendIsoDate(app.appliedDate)
  const followUpDate = toBackendIsoDate(app.followUpDate)

  return {
    company: app.company.trim(),
    jobTitle: app.role.trim(),
    status,
    location: app.location?.trim() || null,
    workplaceType,
    employmentType,
    jobUrl: app.jobUrl?.trim() || null,
    source: app.source?.trim() || null,
    sourceJobId: app.sourceJobId?.trim() || null,
    minSalary: app.minSalary ?? null,
    maxSalary: app.maxSalary ?? null,
    salary: app.salary?.trim() || null,
    appliedAt,
    followUpDate,
    notes: app.notes?.trim() || null,
  }
}

/**
 * Maps partial frontend application updates to the backend UpdateApplicationPayload.
 */
export function toBackendUpdatePayload(
  app: Partial<JobApplication>
): UpdateApplicationPayload {
  const payload: UpdateApplicationPayload = {}

  if (app.company !== undefined) {
    payload.company = app.company.trim()
  }
  if (app.role !== undefined) {
    payload.jobTitle = app.role.trim()
  }
  if (app.status !== undefined) {
    payload.status = STATUS_TO_BACKEND[app.status] || 'SAVED'
  }
  if (app.location !== undefined) {
    payload.location = app.location?.trim() || null
  }
  if (app.workplaceType !== undefined) {
    payload.workplaceType = WORKPLACE_TO_BACKEND[app.workplaceType] || 'REMOTE'
  }
  if (app.employmentType !== undefined) {
    payload.employmentType = app.employmentType
      ? EMPLOYMENT_TO_BACKEND[app.employmentType] || null
      : null
  }
  if (app.jobUrl !== undefined) {
    payload.jobUrl = app.jobUrl?.trim() || null
  }
  if (app.source !== undefined) {
    payload.source = app.source?.trim() || null
  }
  if (app.sourceJobId !== undefined) {
    payload.sourceJobId = app.sourceJobId?.trim() || null
  }
  if (app.minSalary !== undefined) {
    payload.minSalary = app.minSalary
  }
  if (app.maxSalary !== undefined) {
    payload.maxSalary = app.maxSalary
  }
  if (app.salary !== undefined) {
    payload.salary = app.salary?.trim() || null
  }
  if (app.appliedDate !== undefined) {
    payload.appliedAt = toBackendIsoDate(app.appliedDate)
  }
  if (app.followUpDate !== undefined) {
    payload.followUpDate = toBackendIsoDate(app.followUpDate)
  }
  if (app.notes !== undefined) {
    payload.notes = app.notes?.trim() || null
  }

  return payload
}

// --- Interview Mappings ---

export const INTERVIEW_TYPE_TO_FRONTEND: Record<string, InterviewType> = {
  PHONE_SCREENING: 'Phone screening',
  VIDEO_INTERVIEW: 'Video interview',
  TECHNICAL_INTERVIEW: 'Technical interview',
  ON_SITE_INTERVIEW: 'On-site interview',
  FINAL_INTERVIEW: 'Final interview',
  OTHER: 'Other',
  'Phone screening': 'Phone screening',
  'Video interview': 'Video interview',
  'Technical interview': 'Technical interview',
  'On-site interview': 'On-site interview',
  'Final interview': 'Final interview',
  Other: 'Other',
}

export const INTERVIEW_TYPE_TO_BACKEND: Record<InterviewType, BackendInterviewType> = {
  'Phone screening': 'PHONE_SCREENING',
  'Video interview': 'VIDEO_INTERVIEW',
  'Technical interview': 'TECHNICAL_INTERVIEW',
  'On-site interview': 'ON_SITE_INTERVIEW',
  'Final interview': 'FINAL_INTERVIEW',
  Other: 'OTHER',
}

/**
 * Maps a backend database interview record to the frontend Interview interface.
 */
export function toFrontendInterview(backend: BackendInterview): Interview {
  const interviewType =
    INTERVIEW_TYPE_TO_FRONTEND[backend.type] || 'Video interview'

  return {
    id: backend.id,
    applicationId: backend.applicationId,
    scheduledAt:
      typeof backend.scheduledAt === 'string'
        ? backend.scheduledAt
        : new Date(backend.scheduledAt).toISOString(),
    interviewType,
    locationOrLink: backend.locationOrLink ?? undefined,
    interviewer: backend.interviewer ?? undefined,
    notes: backend.notes ?? undefined,
    createdAt:
      typeof backend.createdAt === 'string'
        ? backend.createdAt
        : new Date(backend.createdAt).toISOString(),
    updatedAt:
      typeof backend.updatedAt === 'string'
        ? backend.updatedAt
        : new Date(backend.updatedAt).toISOString(),
  }
}

/**
 * Maps a frontend interview creation input to the backend CreateInterviewPayload.
 */
export function toBackendInterviewCreatePayload(
  interview: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>
): CreateInterviewPayload {
  const type = interview.interviewType
    ? INTERVIEW_TYPE_TO_BACKEND[interview.interviewType] || 'VIDEO_INTERVIEW'
    : 'VIDEO_INTERVIEW'

  return {
    applicationId: interview.applicationId,
    scheduledAt: interview.scheduledAt,
    type,
    locationOrLink: interview.locationOrLink?.trim() || null,
    interviewer: interview.interviewer?.trim() || null,
    notes: interview.notes?.trim() || null,
  }
}

/**
 * Maps partial frontend interview updates to the backend UpdateInterviewPayload.
 */
export function toBackendInterviewUpdatePayload(
  interview: Partial<Interview>
): UpdateInterviewPayload {
  const payload: UpdateInterviewPayload = {}

  if (interview.applicationId !== undefined) {
    payload.applicationId = interview.applicationId
  }
  if (interview.scheduledAt !== undefined) {
    payload.scheduledAt = interview.scheduledAt
  }
  if (interview.interviewType !== undefined) {
    payload.type =
      INTERVIEW_TYPE_TO_BACKEND[interview.interviewType] || 'VIDEO_INTERVIEW'
  }
  if (interview.locationOrLink !== undefined) {
    payload.locationOrLink = interview.locationOrLink?.trim() || null
  }
  if (interview.interviewer !== undefined) {
    payload.interviewer = interview.interviewer?.trim() || null
  }
  if (interview.notes !== undefined) {
    payload.notes = interview.notes?.trim() || null
  }

  return payload
}

