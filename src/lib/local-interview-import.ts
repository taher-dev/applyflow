import type { Interview, JobApplication, InterviewType } from '@/types/dashboard'
import { loadInterviews, saveInterviews, STORAGE_KEYS, isStorageAvailable } from './storage.ts'
import { initialInterviews } from '../data/mockData.ts'
import { api, ApiError } from './api.ts'
import { getImportLedger } from './local-import.ts'
import {
  toFrontendInterview,
  toBackendInterviewCreatePayload,
} from './application-mapper.ts'

export const INTERVIEW_IMPORT_LEDGER_PREFIX = 'applyflow_interview_ledger_v1'

export interface CategorizedLegacyInterview {
  record: Interview
  legacyId: string
  mappedApplicationId: string | null
  parentApp?: JobApplication
  status: 'eligible' | 'already_imported' | 'unmappable' | 'invalid' | 'demo'
  reason?: string
}

export interface LegacyInterviewDetectionResult {
  hasLegacyData: boolean
  totalCount: number
  eligibleCount: number
  alreadyImportedCount: number
  unmappableCount: number
  invalidCount: number
  demoCount: number
  eligibleRecords: CategorizedLegacyInterview[]
  allCategorized: CategorizedLegacyInterview[]
}

export interface InterviewImportItemResult {
  legacyId: string
  newId: string
  interview: Interview
}

export interface InterviewImportFailureResult {
  record: Interview
  legacyId: string
  error: string
}

export interface InterviewImportSummary {
  totalProcessed: number
  succeeded: InterviewImportItemResult[]
  failed: InterviewImportFailureResult[]
  skippedAlreadyImported: number
  skippedUnmappable: number
  skippedInvalid: number
}

/**
 * Returns a user-scoped storage key for the interview import ledger.
 */
export function getInterviewLedgerStorageKey(userId?: string): string {
  const cleanId = userId ? userId.trim() : 'anonymous'
  return `${INTERVIEW_IMPORT_LEDGER_PREFIX}_${cleanId}`
}

/**
 * Determines whether a legacy interview matches initial seeded demo data.
 */
export function isDemoInterview(interview: Interview): boolean {
  return initialInterviews.some(
    (demo) =>
      demo.id === interview.id ||
      (demo.scheduledAt === interview.scheduledAt &&
        demo.interviewer === interview.interviewer &&
        demo.interviewType === interview.interviewType)
  )
}

/**
 * Loads the user-scoped ledger tracking legacy interview IDs to backend UUIDs.
 */
export function getInterviewImportLedger(userId?: string): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }
  try {
    const key = getInterviewLedgerStorageKey(userId)
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Persists the user-scoped interview import ledger.
 */
export function saveInterviewImportLedger(
  ledger: Record<string, string>,
  userId?: string
): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const key = getInterviewLedgerStorageKey(userId)
    window.localStorage.setItem(key, JSON.stringify(ledger))
  } catch {
    // Storage quota or permission error
  }
}

/**
 * Generates a deterministic fingerprint for an interview.
 * Used for deduplication when records lack stable unique IDs or when checking for duplicates.
 */
export function generateInterviewFingerprint(
  applicationId: string,
  scheduledAt: string,
  type?: string,
  interviewer?: string
): string {
  const dateObj = new Date(scheduledAt)
  const normDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : scheduledAt.trim()
  const normType = (type || 'VIDEO_INTERVIEW').trim().toUpperCase()
  const normInterviewer = (interviewer || '').trim().toLowerCase()
  return `${applicationId}|${normDate}|${normType}|${normInterviewer}`
}

/**
 * Generates an offline JSON backup of legacy interview data.
 * Reads raw storage directly so that even malformed or corrupted records are preserved.
 */
export function createInterviewBackupJsonString(records?: unknown[]): string {
  let exportData = records

  // If no explicit records provided, attempt to parse raw localStorage
  if (!exportData && isStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.INTERVIEWS)
      if (raw) {
        exportData = JSON.parse(raw)
      }
    } catch {
      // In case of unparseable raw JSON, wrap as raw string
      const raw = window.localStorage.getItem(STORAGE_KEYS.INTERVIEWS)
      exportData = [{ rawCorruptedData: raw }]
    }
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 'applyflow-interview-backup-v1',
      recordCount: Array.isArray(exportData) ? exportData.length : 1,
      interviews: exportData ?? [],
    },
    null,
    2
  )
}

/**
 * Inspects localStorage for legacy interviews and categorizes them against
 * the current authenticated user's cloud applications.
 */
export function detectLegacyInterviews(
  userApplications: JobApplication[],
  existingInterviews: Interview[] = [],
  userId?: string
): LegacyInterviewDetectionResult {
  const loadResult = loadInterviews()
  const rawList = loadResult.data || []

  if (rawList.length === 0) {
    return {
      hasLegacyData: false,
      totalCount: 0,
      eligibleCount: 0,
      alreadyImportedCount: 0,
      unmappableCount: 0,
      invalidCount: 0,
      demoCount: 0,
      eligibleRecords: [],
      allCategorized: [],
    }
  }

  const appLedger = getImportLedger()
  const interviewLedger = getInterviewImportLedger(userId)

  // Map of cloud application IDs owned by this user
  const userAppMap = new Map<string, JobApplication>()
  for (const app of userApplications) {
    userAppMap.set(app.id, app)
  }

  // Set of fingerprints from existing cloud interviews to detect duplicates
  const existingFingerprints = new Set<string>()
  for (const existing of existingInterviews) {
    existingFingerprints.add(
      generateInterviewFingerprint(
        existing.applicationId,
        existing.scheduledAt,
        existing.interviewType,
        existing.interviewer
      )
    )
  }

  const allCategorized: CategorizedLegacyInterview[] = []
  const eligibleRecords: CategorizedLegacyInterview[] = []

  let eligibleCount = 0
  let alreadyImportedCount = 0
  let unmappableCount = 0
  let invalidCount = 0
  let demoCount = 0

  for (const item of rawList) {
    const legacyId = item.id || `anon-${Math.random().toString(36).slice(2)}`

    // 1. Check if seeded demonstration data
    if (isDemoInterview(item)) {
      demoCount++
      allCategorized.push({
        record: item,
        legacyId,
        mappedApplicationId: null,
        status: 'demo',
        reason: 'Seeded demonstration interview template',
      })
      continue
    }

    // 2. Validate scheduled date
    const dateObj = new Date(item.scheduledAt)
    if (!item.scheduledAt || isNaN(dateObj.getTime())) {
      invalidCount++
      allCategorized.push({
        record: item,
        legacyId,
        mappedApplicationId: null,
        status: 'invalid',
        reason: 'Invalid or missing scheduled date and time',
      })
      continue
    }

    // 3. Resolve parent application to an authenticated cloud application
    let mappedAppId: string | null = null

    // Strategy A: Direct match to current user's cloud applications
    if (userAppMap.has(item.applicationId)) {
      mappedAppId = item.applicationId
    }
    // Strategy B: Lookup via application import ledger (legacy app ID -> cloud app UUID)
    else if (appLedger[item.applicationId] && userAppMap.has(appLedger[item.applicationId])) {
      mappedAppId = appLedger[item.applicationId]
    }

    if (!mappedAppId) {
      unmappableCount++
      allCategorized.push({
        record: item,
        legacyId,
        mappedApplicationId: null,
        status: 'unmappable',
        reason: `Parent application ID '${item.applicationId}' not found in your cloud account`,
      })
      continue
    }

    const parentApp = userAppMap.get(mappedAppId)
    const fingerprint = generateInterviewFingerprint(
      mappedAppId,
      item.scheduledAt,
      item.interviewType,
      item.interviewer
    )

    // 4. Check idempotency: already in ledger or already in cloud interviews
    if (interviewLedger[legacyId] || interviewLedger[fingerprint] || existingFingerprints.has(fingerprint)) {
      alreadyImportedCount++
      allCategorized.push({
        record: item,
        legacyId,
        mappedApplicationId: mappedAppId,
        parentApp,
        status: 'already_imported',
        reason: 'Already imported to your cloud account',
      })
      continue
    }

    // 5. Eligible for migration
    eligibleCount++
    const categorized: CategorizedLegacyInterview = {
      record: item,
      legacyId,
      mappedApplicationId: mappedAppId,
      parentApp,
      status: 'eligible',
    }
    eligibleRecords.push(categorized)
    allCategorized.push(categorized)
  }

  return {
    hasLegacyData: rawList.length > 0,
    totalCount: rawList.length,
    eligibleCount,
    alreadyImportedCount,
    unmappableCount,
    invalidCount,
    demoCount,
    eligibleRecords,
    allCategorized,
  }
}

/**
 * Imports eligible legacy interviews to the authenticated cloud backend.
 * Provides granular progress reporting, strict idempotency, and user isolation.
 */
export async function importInterviewsToCloud(
  recordsToImport: CategorizedLegacyInterview[],
  userId?: string,
  onProgress?: (current: number, total: number, item: CategorizedLegacyInterview) => void
): Promise<InterviewImportSummary> {
  const ledger = getInterviewImportLedger(userId)
  const summary: InterviewImportSummary = {
    totalProcessed: recordsToImport.length,
    succeeded: [],
    failed: [],
    skippedAlreadyImported: 0,
    skippedUnmappable: 0,
    skippedInvalid: 0,
  }

  for (let i = 0; i < recordsToImport.length; i++) {
    const item = recordsToImport[i]
    onProgress?.(i + 1, recordsToImport.length, item)

    // Verify mappable
    if (!item.mappedApplicationId) {
      summary.skippedUnmappable++
      continue
    }

    // Verify valid date
    const dateObj = new Date(item.record.scheduledAt)
    if (isNaN(dateObj.getTime())) {
      summary.skippedInvalid++
      continue
    }

    const fingerprint = generateInterviewFingerprint(
      item.mappedApplicationId,
      item.record.scheduledAt,
      item.record.interviewType,
      item.record.interviewer
    )

    // Idempotency check: Skip if already in ledger
    if (ledger[item.legacyId] || ledger[fingerprint]) {
      summary.skippedAlreadyImported++
      continue
    }

    try {
      const payload = toBackendInterviewCreatePayload({
        applicationId: item.mappedApplicationId,
        scheduledAt: dateObj.toISOString(),
        interviewType: (item.record.interviewType || 'Video interview') as InterviewType,
        locationOrLink: item.record.locationOrLink?.trim() || undefined,
        interviewer: item.record.interviewer?.trim() || undefined,
        notes: item.record.notes?.trim() || undefined,
      })

      const createdBackend = await api.interviews.create(payload)

      const frontendInterview = toFrontendInterview(createdBackend)

      // Record in ledger with both legacyId and fingerprint
      ledger[item.legacyId] = createdBackend.id
      ledger[fingerprint] = createdBackend.id
      saveInterviewImportLedger(ledger, userId)

      summary.succeeded.push({
        legacyId: item.legacyId,
        newId: createdBackend.id,
        interview: frontendInterview,
      })
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to import interview'

      summary.failed.push({
        record: item.record,
        legacyId: item.legacyId,
        error: errorMessage,
      })
    }
  }

  return summary
}

/**
 * Removes only successfully imported legacy interviews from localStorage.
 * Retains failed, unmappable, or unselected records so they are never lost.
 */
export function removeImportedInterviewsFromLocalStorage(
  importedLegacyIds: string[]
): void {
  const loaded = loadInterviews()
  if (!loaded.data) return

  const importedSet = new Set(importedLegacyIds)
  const remaining = loaded.data.filter((int) => !importedSet.has(int.id))
  saveInterviews(remaining)
}
