import { z } from 'zod'
import type {
  JobApplication,
  Interview,
  ApplicationStatus,
  WorkplaceType,
  EmploymentType,
  InterviewType,
  NavigationKey,
} from '@/types/dashboard'

/**
 * Storage key constants with explicit versioning.
 * Versioning keys (e.g. _v1) enables seamless schema migrations in future versions
 * without colliding with existing user data or other localStorage keys.
 */
export const STORAGE_KEYS = {
  APPLICATIONS: 'applyflow_applications_v1',
  INTERVIEWS: 'applyflow_interviews_v1',
  ACTIVE_TAB: 'applyflow_active_tab_v1',
} as const

// --- Zod Validation Schemas ---

export const ApplicationStatusSchema: z.ZodType<ApplicationStatus> = z.enum([
  'Applied',
  'Rejected',
  'Offer',
  'Active',
  'Saved',
  'Screening',
  'Interview',
])

export const WorkplaceTypeSchema: z.ZodType<WorkplaceType> = z.enum([
  'Remote',
  'Hybrid',
  'On-site',
])

export const EmploymentTypeSchema: z.ZodType<EmploymentType> = z.enum([
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
])

export const JobApplicationSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  workplaceType: WorkplaceTypeSchema,
  employmentType: EmploymentTypeSchema.optional(),
  jobUrl: z.string().optional(),
  source: z.string().optional(),
  sourceJobId: z.string().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  salary: z.string().optional(),
  appliedDate: z.string().min(1),
  status: ApplicationStatusSchema,
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
})

export const InterviewTypeSchema: z.ZodType<InterviewType> = z.enum([
  'Phone screening',
  'Video interview',
  'Technical interview',
  'On-site interview',
  'Final interview',
  'Other',
])

export const InterviewSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  scheduledAt: z.string().min(1),
  interviewType: InterviewTypeSchema.optional().default('Video interview'),
  notes: z.string().optional(),
  locationOrLink: z.string().optional(),
  interviewer: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const NavigationKeySchema: z.ZodType<NavigationKey> = z.enum([
  'overview',
  'applications',
  'pipeline',
  'interviews',
  'jobs',
  'calendar',
  'settings',
])

export interface StorageLoadResult<T> {
  data: T[] | null
  isFirstVisit: boolean
  recoveredCount: number
  error?: 'STORAGE_UNAVAILABLE' | 'INVALID_JSON' | 'NOT_AN_ARRAY'
}

/**
 * Checks whether localStorage is available and writable in the current runtime environment.
 * Gracefully handles SSR, browser security restrictions (e.g. disabled cookies, incognito quota),
 * and quota exhaustion.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }
  try {
    const testKey = '__applyflow_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Loads and validates persisted applications from localStorage.
 * Handles missing keys (first visit), invalid JSON, and non-array formats.
 * Recovers valid records individually if some items fail validation.
 */
export function loadApplications(): StorageLoadResult<JobApplication> {
  if (!isStorageAvailable()) {
    return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'STORAGE_UNAVAILABLE' }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APPLICATIONS)
    if (raw === null) {
      return { data: null, isFirstVisit: true, recoveredCount: 0 }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.warn('[ApplyFlow Storage] Malformed JSON detected in stored applications.')
      return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'INVALID_JSON' }
    }

    if (!Array.isArray(parsed)) {
      console.warn('[ApplyFlow Storage] Stored applications payload is not an array.')
      return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'NOT_AN_ARRAY' }
    }

    const validApplications: JobApplication[] = []
    let invalidCount = 0

    for (const item of parsed) {
      const result = JobApplicationSchema.safeParse(item)
      if (result.success) {
        validApplications.push(result.data as JobApplication)
      } else {
        invalidCount++
      }
    }

    if (invalidCount > 0) {
      console.warn(
        `[ApplyFlow Storage] Recovered ${validApplications.length} valid application(s); filtered ${invalidCount} corrupted record(s).`
      )
    }

    return {
      data: validApplications,
      isFirstVisit: false,
      recoveredCount: invalidCount,
    }
  } catch {
    return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'STORAGE_UNAVAILABLE' }
  }
}

/**
 * Persists an array of JobApplications to localStorage.
 * Returns true if successful, false if storage is unavailable or quota was exceeded.
 */
export function saveApplications(applications: JobApplication[]): boolean {
  if (!isStorageAvailable()) return false

  try {
    const json = JSON.stringify(applications)
    window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, json)
    return true
  } catch {
    console.warn('[ApplyFlow Storage] Failed to write applications to localStorage.')
    return false
  }
}

/**
 * Loads and validates persisted interviews from localStorage.
 * Optionally validates foreign key integrity against an active set of application IDs,
 * filtering out orphaned interview records whose parent application no longer exists.
 */
export function loadInterviews(validApplicationIds?: Set<string>): StorageLoadResult<Interview> {
  if (!isStorageAvailable()) {
    return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'STORAGE_UNAVAILABLE' }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.INTERVIEWS)
    if (raw === null) {
      return { data: null, isFirstVisit: true, recoveredCount: 0 }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.warn('[ApplyFlow Storage] Malformed JSON detected in stored interviews.')
      return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'INVALID_JSON' }
    }

    if (!Array.isArray(parsed)) {
      console.warn('[ApplyFlow Storage] Stored interviews payload is not an array.')
      return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'NOT_AN_ARRAY' }
    }

    const validInterviews: Interview[] = []
    let invalidCount = 0

    for (const item of parsed) {
      const result = InterviewSchema.safeParse(item)
      if (result.success) {
        // Enforce referential integrity: if application list is known, drop orphaned interviews
        if (validApplicationIds && !validApplicationIds.has(result.data.applicationId)) {
          invalidCount++
          continue
        }
        validInterviews.push(result.data as Interview)
      } else {
        invalidCount++
      }
    }

    if (invalidCount > 0) {
      console.warn(
        `[ApplyFlow Storage] Recovered ${validInterviews.length} valid interview(s); filtered ${invalidCount} invalid or orphaned record(s).`
      )
    }

    return {
      data: validInterviews,
      isFirstVisit: false,
      recoveredCount: invalidCount,
    }
  } catch {
    return { data: null, isFirstVisit: false, recoveredCount: 0, error: 'STORAGE_UNAVAILABLE' }
  }
}

/**
 * Persists an array of Interviews to localStorage.
 * Returns true if successful, false if storage is unavailable or quota was exceeded.
 */
export function saveInterviews(interviews: Interview[]): boolean {
  if (!isStorageAvailable()) return false

  try {
    const json = JSON.stringify(interviews)
    window.localStorage.setItem(STORAGE_KEYS.INTERVIEWS, json)
    return true
  } catch {
    console.warn('[ApplyFlow Storage] Failed to write interviews to localStorage.')
    return false
  }
}

/**
 * Loads the last active navigation tab from localStorage.
 * Validates the value using NavigationKeySchema and falls back to 'overview'.
 */
export function loadActiveTab(): NavigationKey {
  if (!isStorageAvailable()) return 'overview'

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)
    if (!raw) return 'overview'

    const parsed = NavigationKeySchema.safeParse(raw)
    return parsed.success ? parsed.data : 'overview'
  } catch {
    return 'overview'
  }
}

/**
 * Persists the active navigation tab to localStorage.
 */
export function saveActiveTab(tab: NavigationKey): boolean {
  if (!isStorageAvailable()) return false

  try {
    window.localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab)
    return true
  } catch {
    return false
  }
}

/**
 * Selectively clears ApplyFlow application, interview, and navigation data from localStorage.
 * Preserves all unrelated localStorage keys belonging to other applications or browser extensions.
 */
export function clearApplyFlowStorage(): boolean {
  if (!isStorageAvailable()) return false

  try {
    window.localStorage.removeItem(STORAGE_KEYS.APPLICATIONS)
    window.localStorage.removeItem(STORAGE_KEYS.INTERVIEWS)
    window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_TAB)
    return true
  } catch {
    return false
  }
}
