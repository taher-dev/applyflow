import type { JobApplication, Interview } from '@/types/dashboard'
import {
  loadApplications,
  saveApplications,
  loadInterviews,
  saveInterviews,
} from './storage.ts'
import { initialApplications } from '../data/mockData.ts'
import { api, ApiError } from './api.ts'
import { toBackendCreatePayload, toFrontendApplication } from './application-mapper.ts'

export const IMPORT_LEDGER_KEY = 'applyflow_import_ledger_v1'

export interface LegacyDetectionResult {
  hasLegacyData: boolean
  totalCount: number
  customCount: number
  demoCount: number
  customRecords: JobApplication[]
  demoRecords: JobApplication[]
}

export interface ImportItemResult {
  legacyId: string
  newId: string
  application: JobApplication
}

export interface ImportFailureResult {
  record: JobApplication
  legacyId: string
  error: string
}

export interface ImportSummary {
  totalProcessed: number
  succeeded: ImportItemResult[]
  failed: ImportFailureResult[]
  skippedAlreadyImported: number
}

/**
 * Checks if a record matches default initial demonstration mock data.
 */
export function isDemoApplication(app: JobApplication): boolean {
  return initialApplications.some(
    (demo) =>
      demo.id === app.id ||
      (demo.company.toLowerCase() === app.company.toLowerCase() &&
        demo.role.toLowerCase() === app.role.toLowerCase())
  )
}

/**
 * Detects whether legacy application records exist in browser localStorage.
 * Separates user-created custom applications from seeded demonstration records.
 */
export function detectLegacyApplications(): LegacyDetectionResult {
  const result = loadApplications()
  if (!result.data || result.data.length === 0) {
    return {
      hasLegacyData: false,
      totalCount: 0,
      customCount: 0,
      demoCount: 0,
      customRecords: [],
      demoRecords: [],
    }
  }

  const customRecords: JobApplication[] = []
  const demoRecords: JobApplication[] = []

  for (const app of result.data) {
    if (isDemoApplication(app)) {
      demoRecords.push(app)
    } else {
      customRecords.push(app)
    }
  }

  return {
    hasLegacyData: result.data.length > 0,
    totalCount: result.data.length,
    customCount: customRecords.length,
    demoCount: demoRecords.length,
    customRecords,
    demoRecords,
  }
}

/**
 * Loads the ledger that tracks legacy application IDs to cloud backend UUIDs.
 */
export function getImportLedger(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(IMPORT_LEDGER_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Updates the import ledger in localStorage.
 */
export function saveImportLedger(ledger: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(IMPORT_LEDGER_KEY, JSON.stringify(ledger))
  } catch {
    // Storage quota or security error
  }
}

/**
 * Re-keys local interview records whose applicationId matches a legacy local ID
 * to point to the newly assigned cloud database UUID.
 * This guarantees interviews aren't orphaned during cloud migration.
 */
export function updateInterviewForeignKeys(legacyId: string, newCloudId: string): void {
  const interviewsRes = loadInterviews()
  if (!interviewsRes.data || interviewsRes.data.length === 0) return

  let hasChanges = false
  const updatedInterviews: Interview[] = interviewsRes.data.map((item) => {
    if (item.applicationId === legacyId) {
      hasChanges = true
      return {
        ...item,
        applicationId: newCloudId,
        updatedAt: new Date().toISOString(),
      }
    }
    return item
  })

  if (hasChanges) {
    saveInterviews(updatedInterviews)
  }
}

/**
 * Creates a downloadable JSON backup blob of legacy records before any changes.
 */
export function createBackupJsonString(records: JobApplication[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 'applyflow-backup-v1',
      recordCount: records.length,
      applications: records,
    },
    null,
    2
  )
}

/**
 * Imports a list of local applications to the authenticated cloud backend.
 * Provides granular progress reporting, idempotency via ledger, and interview FK preservation.
 */
export async function importApplicationsToCloud(
  recordsToImport: JobApplication[],
  onProgress?: (current: number, total: number, item: JobApplication) => void
): Promise<ImportSummary> {
  const ledger = getImportLedger()
  const summary: ImportSummary = {
    totalProcessed: recordsToImport.length,
    succeeded: [],
    failed: [],
    skippedAlreadyImported: 0,
  }

  for (let i = 0; i < recordsToImport.length; i++) {
    const app = recordsToImport[i]
    onProgress?.(i + 1, recordsToImport.length, app)

    // Idempotency check: If already mapped to cloud in ledger, skip re-creating
    if (ledger[app.id]) {
      summary.skippedAlreadyImported++
      continue
    }

    try {
      const payload = toBackendCreatePayload(app)
      const backendCreated = await api.applications.create(payload)
      const frontendApp = toFrontendApplication(backendCreated)

      // Record in ledger
      ledger[app.id] = backendCreated.id
      saveImportLedger(ledger)

      // Re-key local interviews that referenced this legacy local application
      updateInterviewForeignKeys(app.id, backendCreated.id)

      summary.succeeded.push({
        legacyId: app.id,
        newId: backendCreated.id,
        application: frontendApp,
      })
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to import application'

      summary.failed.push({
        record: app,
        legacyId: app.id,
        error: errorMessage,
      })
    }
  }

  return summary
}

/**
 * Clears only the legacy applications that were confirmed to have been imported.
 * Retains failed or unselected records safely.
 */
export function removeImportedFromLocalStorage(importedLegacyIds: string[]): void {
  const loaded = loadApplications()
  if (!loaded.data) return

  const importedSet = new Set(importedLegacyIds)
  const remaining = loaded.data.filter((app) => !importedSet.has(app.id))
  saveApplications(remaining)
}
