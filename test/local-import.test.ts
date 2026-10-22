import test, { describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  isDemoApplication,
  detectLegacyApplications,
  createBackupJsonString,
  getImportLedger,
  saveImportLedger,
  updateInterviewForeignKeys,
  importApplicationsToCloud,
  removeImportedFromLocalStorage,
} from '../src/lib/local-import.ts'
import { saveApplications, saveInterviews, loadApplications, loadInterviews } from '../src/lib/storage.ts'
import type { JobApplication, Interview } from '../src/types/dashboard.ts'
import { api } from '../src/lib/api.ts'
import type { BackendApplication } from '../src/types/application.ts'

// In-memory mock localStorage for Node test runner
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
  removeItem(key: string): void {
    delete this.store[key]
  }
  clear(): void {
    this.store = {}
  }
}

describe('Legacy LocalStorage Detection & Migration', () => {
  const customApp1: JobApplication = {
    id: 'custom-app-1',
    company: 'Anthropic',
    role: 'Prompt Engineer',
    status: 'Applied',
    workplaceType: 'Remote',
    appliedDate: '2026-10-15',
  }

  const customApp2: JobApplication = {
    id: 'custom-app-2',
    company: 'Cohere',
    role: 'ML Platform Lead',
    status: 'Interview',
    workplaceType: 'Hybrid',
    appliedDate: '2026-10-16',
  }

  const demoApp: JobApplication = {
    id: 'app-1',
    company: 'Stripe',
    role: 'Senior Frontend Engineer',
    status: 'Interview',
    workplaceType: 'Remote',
    appliedDate: '2026-10-08',
  }

  beforeEach(() => {
    // Provide isolated window.localStorage mock
    const mockStorage = new LocalStorageMock()
    // @ts-expect-error mock window for Node
    globalThis.window = { localStorage: mockStorage }
  })

  afterEach(() => {
    // @ts-expect-error cleanup window
    delete globalThis.window
  })

  test('isDemoApplication distinguishes mock template data from custom user applications', () => {
    assert.equal(isDemoApplication(demoApp), true)
    assert.equal(isDemoApplication(customApp1), false)
  })

  test('detectLegacyApplications categorizes custom user records vs demo records', () => {
    saveApplications([demoApp, customApp1, customApp2])

    const detection = detectLegacyApplications()

    assert.equal(detection.hasLegacyData, true)
    assert.equal(detection.totalCount, 3)
    assert.equal(detection.demoCount, 1)
    assert.equal(detection.customCount, 2)
    assert.deepEqual(detection.customRecords, [customApp1, customApp2])
  })

  test('createBackupJsonString exports valid JSON backup with metadata', () => {
    const backupStr = createBackupJsonString([customApp1])
    const parsed = JSON.parse(backupStr)

    assert.equal(parsed.recordCount, 1)
    assert.equal(parsed.version, 'applyflow-backup-v1')
    assert.ok(parsed.exportedAt)
    assert.equal(parsed.applications[0].company, 'Anthropic')
  })

  test('importLedger persists and loads mappings between legacy IDs and backend UUIDs', () => {
    const initialLedger = getImportLedger()
    assert.deepEqual(initialLedger, {})

    saveImportLedger({ 'custom-app-1': 'uuid-abc-123' })
    const loaded = getImportLedger()
    assert.equal(loaded['custom-app-1'], 'uuid-abc-123')
  })

  test('updateInterviewForeignKeys re-keys local interviews when parent application gets new cloud UUID', () => {
    const mockInterview: Interview = {
      id: 'int-1',
      applicationId: 'custom-app-1', // Points to legacy local ID
      scheduledAt: '2026-10-25T14:00',
      interviewType: 'Technical interview',
      createdAt: '2026-10-18T10:00:00.000Z',
      updatedAt: '2026-10-18T10:00:00.000Z',
    }

    saveInterviews([mockInterview])

    updateInterviewForeignKeys('custom-app-1', 'cloud-uuid-777')

    const loaded = loadInterviews()
    assert.ok(loaded.data)
    assert.equal(loaded.data.length, 1)
    assert.equal(loaded.data[0].applicationId, 'cloud-uuid-777') // Successfully re-keyed!
  })

  test('importApplicationsToCloud sends records to backend and updates ledger and interview foreign keys', async () => {
    const mockBackendApp: BackendApplication = {
      id: 'cloud-uuid-999',
      userId: 'user-uuid-1',
      company: 'Anthropic',
      jobTitle: 'Prompt Engineer',
      status: 'APPLIED',
      location: null,
      workplaceType: 'REMOTE',
      employmentType: null,
      jobUrl: null,
      minSalary: null,
      maxSalary: null,
      salary: null,
      appliedAt: '2026-10-15T00:00:00.000Z',
      followUpDate: null,
      notes: null,
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
    }

    // Mock API client
    const originalCreate = api.applications.create
    let capturedPayload: unknown = null

    api.applications.create = async (payload) => {
      capturedPayload = payload
      return mockBackendApp
    }

    // Setup an interview pointing to customApp1
    saveInterviews([
      {
        id: 'interview-1',
        applicationId: 'custom-app-1',
        scheduledAt: '2026-10-26T15:00',
        interviewType: 'Phone screening',
        createdAt: '2026-10-18T10:00:00.000Z',
        updatedAt: '2026-10-18T10:00:00.000Z',
      },
    ])

    const summary = await importApplicationsToCloud([customApp1])

    assert.equal(summary.succeeded.length, 1)
    assert.equal(summary.failed.length, 0)
    assert.equal(summary.succeeded[0].newId, 'cloud-uuid-999')
    assert.ok(capturedPayload)

    // Verify ledger was updated
    const ledger = getImportLedger()
    assert.equal(ledger['custom-app-1'], 'cloud-uuid-999')

    // Verify interview was re-keyed
    const updatedInterviews = loadInterviews()
    assert.equal(updatedInterviews.data?.[0].applicationId, 'cloud-uuid-999')

    // Test Idempotency: Running again skips already imported application
    const secondSummary = await importApplicationsToCloud([customApp1])
    assert.equal(secondSummary.skippedAlreadyImported, 1)
    assert.equal(secondSummary.succeeded.length, 0)

    // Restore API
    api.applications.create = originalCreate
  })

  test('partial import failure records failure, preserves failed record, and allows safe retry', async () => {
    saveApplications([customApp1, customApp2])

    const originalCreate = api.applications.create

    // First run: customApp1 succeeds, customApp2 fails with server error
    api.applications.create = async (payload) => {
      if (payload.company === 'Cohere') {
        throw new Error('500 Internal Server Error')
      }
      return {
        id: 'cloud-uuid-1',
        userId: 'user-uuid-1',
        company: payload.company,
        jobTitle: payload.jobTitle,
        status: payload.status,
        location: null,
        workplaceType: null,
        employmentType: null,
        jobUrl: null,
        minSalary: null,
        maxSalary: null,
        salary: null,
        appliedAt: null,
        followUpDate: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    const firstSummary = await importApplicationsToCloud([customApp1, customApp2])

    assert.equal(firstSummary.succeeded.length, 1)
    assert.equal(firstSummary.succeeded[0].legacyId, 'custom-app-1')
    assert.equal(firstSummary.failed.length, 1)
    assert.equal(firstSummary.failed[0].legacyId, 'custom-app-2')
    assert.match(firstSummary.failed[0].error, /500 Internal Server Error/)

    // Ledger only contains customApp1
    const ledger = getImportLedger()
    assert.equal(ledger['custom-app-1'], 'cloud-uuid-1')
    assert.equal(ledger['custom-app-2'], undefined)

    // User removes only succeeded IDs from localStorage
    removeImportedFromLocalStorage(firstSummary.succeeded.map((s) => s.legacyId))
    const remainingInStorage = loadApplications()
    assert.equal(remainingInStorage.data?.length, 1)
    assert.equal(remainingInStorage.data?.[0].id, 'custom-app-2')

    // Second run (Retry): Temporary error resolved
    api.applications.create = async (payload) => {
      return {
        id: 'cloud-uuid-2',
        userId: 'user-uuid-1',
        company: payload.company,
        jobTitle: payload.jobTitle,
        status: payload.status,
        location: null,
        workplaceType: null,
        employmentType: null,
        jobUrl: null,
        minSalary: null,
        maxSalary: null,
        salary: null,
        appliedAt: null,
        followUpDate: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    // Retrying with remaining record (or even both records)
    const retrySummary = await importApplicationsToCloud([customApp1, customApp2])
    assert.equal(retrySummary.skippedAlreadyImported, 1) // customApp1 safely skipped
    assert.equal(retrySummary.succeeded.length, 1)
    assert.equal(retrySummary.succeeded[0].legacyId, 'custom-app-2')
    assert.equal(retrySummary.failed.length, 0)

    // Clean up
    api.applications.create = originalCreate
  })

  test('removeImportedFromLocalStorage only removes successfully imported records', () => {
    saveApplications([customApp1, customApp2])

    // Only customApp1 was imported
    removeImportedFromLocalStorage(['custom-app-1'])

    const loaded = loadApplications()
    assert.ok(loaded.data)
    assert.equal(loaded.data.length, 1)
    assert.equal(loaded.data[0].id, 'custom-app-2') // customApp2 preserved!
  })
})
