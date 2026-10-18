import test, { describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  STORAGE_KEYS,
  isStorageAvailable,
  loadApplications,
  saveApplications,
  loadInterviews,
  saveInterviews,
  clearApplyFlowStorage,
  JobApplicationSchema,
  InterviewSchema,
} from '../src/lib/storage.ts'
import type { JobApplication, Interview } from '../src/types/dashboard.ts'

// In-memory mock localStorage implementation for testing storage service edge cases
class MockLocalStorage {
  private store: Map<string, string> = new Map()
  public throwOnSet = false
  public throwOnGet = false

  getItem(key: string): string | null {
    if (this.throwOnGet) {
      throw new Error('SecurityError: Access to localStorage is denied')
    }
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) {
      throw new Error('QuotaExceededError: localStorage quota exceeded')
    }
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
}

// Sample test data
const sampleApp: JobApplication = {
  id: 'app-test-1',
  company: 'Acme Corp',
  role: 'Frontend Engineer',
  workplaceType: 'Remote',
  appliedDate: '2026-10-15',
  status: 'Applied',
}

const sampleInterview: Interview = {
  id: 'int-test-1',
  applicationId: 'app-test-1',
  scheduledAt: '2026-10-20T14:00',
  interviewType: 'Technical interview',
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-10-15T10:00:00Z',
}

describe('ApplyFlow Storage Service & State Integrity', () => {
  let mockStorage: MockLocalStorage

  beforeEach(() => {
    mockStorage = new MockLocalStorage()
    // Inject mock into global window object for test isolation
    // @ts-expect-error Mocking window for Node environment
    globalThis.window = {
      localStorage: mockStorage,
    }
  })

  test('1. First-time initialization with no saved data returns isFirstVisit', () => {
    assert.equal(isStorageAvailable(), true)

    const appResult = loadApplications()
    assert.equal(appResult.data, null)
    assert.equal(appResult.isFirstVisit, true)
    assert.equal(appResult.recoveredCount, 0)

    const intResult = loadInterviews()
    assert.equal(intResult.data, null)
    assert.equal(intResult.isFirstVisit, true)
  })

  test('2. Saving and restoring saved applications', () => {
    const appsToSave: JobApplication[] = [sampleApp]
    const saved = saveApplications(appsToSave)
    assert.equal(saved, true)

    const loaded = loadApplications()
    assert.equal(loaded.isFirstVisit, false)
    assert.ok(loaded.data)
    assert.equal(loaded.data.length, 1)
    assert.equal(loaded.data[0].id, 'app-test-1')
    assert.equal(loaded.data[0].company, 'Acme Corp')
  })

  test('3. Saving and restoring saved interviews', () => {
    const interviewsToSave: Interview[] = [sampleInterview]
    const saved = saveInterviews(interviewsToSave)
    assert.equal(saved, true)

    const loaded = loadInterviews(new Set(['app-test-1']))
    assert.equal(loaded.isFirstVisit, false)
    assert.ok(loaded.data)
    assert.equal(loaded.data.length, 1)
    assert.equal(loaded.data[0].id, 'int-test-1')
    assert.equal(loaded.data[0].applicationId, 'app-test-1')
  })

  test('4. Adding and editing applications updates persistent storage', () => {
    // Add application
    const appList: JobApplication[] = [sampleApp]
    saveApplications(appList)

    // Edit application
    const updatedList = appList.map((a) =>
      a.id === 'app-test-1' ? { ...a, role: 'Staff UI Architect', salary: '$220k' } : a
    )
    saveApplications(updatedList)

    const restored = loadApplications()
    assert.ok(restored.data)
    assert.equal(restored.data[0].role, 'Staff UI Architect')
    assert.equal(restored.data[0].salary, '$220k')
  })

  test('5. Deleting an application stays deleted', () => {
    saveApplications([sampleApp])
    assert.equal(loadApplications().data?.length, 1)

    // Delete application
    saveApplications([])
    const afterDelete = loadApplications()
    assert.ok(afterDelete.data)
    assert.equal(afterDelete.data.length, 0)
    // Must NOT treat explicit empty array as first-time visit!
    assert.equal(afterDelete.isFirstVisit, false)
  })

  test('6. Changing application status is saved properly', () => {
    saveApplications([sampleApp])
    const movedToOffer = [{ ...sampleApp, status: 'Offer' as const }]
    saveApplications(movedToOffer)

    const loaded = loadApplications()
    assert.ok(loaded.data)
    assert.equal(loaded.data[0].status, 'Offer')
  })

  test('7. Scheduling and editing interviews', () => {
    saveInterviews([sampleInterview])

    const updatedInterview = {
      ...sampleInterview,
      scheduledAt: '2026-10-25T16:00',
      notes: 'Rescheduled upon recruiter request.',
    }
    saveInterviews([updatedInterview])

    const loaded = loadInterviews()
    assert.ok(loaded.data)
    assert.equal(loaded.data[0].scheduledAt, '2026-10-25T16:00')
    assert.equal(loaded.data[0].notes, 'Rescheduled upon recruiter request.')
  })

  test('8. Deleting interviews persists empty state', () => {
    saveInterviews([sampleInterview])
    assert.equal(loadInterviews().data?.length, 1)

    saveInterviews([])
    const loaded = loadInterviews()
    assert.ok(loaded.data)
    assert.equal(loaded.data.length, 0)
    assert.equal(loaded.isFirstVisit, false)
  })

  test('9. Refreshing simulation: State reloaded from storage is identical', () => {
    const apps = [
      sampleApp,
      {
        id: 'app-test-2',
        company: 'Stripe',
        role: 'Full Stack Engineer',
        workplaceType: 'Hybrid' as const,
        appliedDate: '2026-10-16',
        status: 'Interview' as const,
      },
    ]
    saveApplications(apps)

    // Simulate page reload: new load call
    const reloaded = loadApplications()
    assert.deepEqual(reloaded.data, apps)
  })

  test('10. Malformed JSON handling: Does not crash and returns INVALID_JSON error', () => {
    mockStorage.setItem(STORAGE_KEYS.APPLICATIONS, '{"invalid_json: true')

    const result = loadApplications()
    assert.equal(result.data, null)
    assert.equal(result.error, 'INVALID_JSON')
    assert.equal(result.isFirstVisit, false)
  })

  test('11. Invalid stored data: Recovers valid records while discarding corrupted objects', () => {
    const mixedData = [
      sampleApp,
      { id: 'corrupt-1', company: 'Broken Corp' }, // missing required fields: role, workplaceType, appliedDate, status
      {
        id: 'app-test-3',
        company: 'Vercel',
        role: 'Design Engineer',
        workplaceType: 'Remote',
        appliedDate: '2026-10-14',
        status: 'Screening',
      },
    ]

    mockStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(mixedData))

    const result = loadApplications()
    assert.ok(result.data)
    assert.equal(result.data.length, 2)
    assert.equal(result.data[0].id, 'app-test-1')
    assert.equal(result.data[1].id, 'app-test-3')
    assert.equal(result.recoveredCount, 1) // 1 corrupt record filtered
  })

  test('12. Storage read/write failures: QuotaExceeded and SecurityError handling', () => {
    mockStorage.throwOnSet = true
    const saveResult = saveApplications([sampleApp])
    assert.equal(saveResult, false) // Gracefully returns false, does not throw unhandled exception

    mockStorage.throwOnSet = false
    mockStorage.throwOnGet = true
    const loadResult = loadApplications()
    assert.equal(loadResult.data, null)
    assert.equal(loadResult.error, 'STORAGE_UNAVAILABLE')
  })

  test('13. Selective clearing: Does not delete unrelated localStorage keys', () => {
    mockStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([sampleApp]))
    mockStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify([sampleInterview]))
    mockStorage.setItem('unrelated_user_theme', 'dark')
    mockStorage.setItem('unrelated_auth_token', 'preserve_me')

    const cleared = clearApplyFlowStorage()
    assert.equal(cleared, true)

    assert.equal(mockStorage.getItem(STORAGE_KEYS.APPLICATIONS), null)
    assert.equal(mockStorage.getItem(STORAGE_KEYS.INTERVIEWS), null)
    assert.equal(mockStorage.getItem('unrelated_user_theme'), 'dark')
    assert.equal(mockStorage.getItem('unrelated_auth_token'), 'preserve_me')
  })

  test('14. Data relationships: Filters out orphaned interviews if parent application is missing', () => {
    const orphanInterview: Interview = {
      id: 'int-orphan',
      applicationId: 'deleted-app-999',
      scheduledAt: '2026-10-22T10:00',
      interviewType: 'Phone screening',
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    }

    mockStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify([sampleInterview, orphanInterview]))

    // Only app-test-1 is in the valid application set
    const validAppIds = new Set(['app-test-1'])
    const result = loadInterviews(validAppIds)

    assert.ok(result.data)
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].id, 'int-test-1')
    assert.equal(result.recoveredCount, 1) // 1 orphan dropped
  })

  test('15. Zod schema validation passes for fully-typed applications and interviews', () => {
    const validApp = JobApplicationSchema.safeParse(sampleApp)
    assert.equal(validApp.success, true)

    const validInterview = InterviewSchema.safeParse(sampleInterview)
    assert.equal(validInterview.success, true)

    const invalidStatusApp = JobApplicationSchema.safeParse({
      ...sampleApp,
      status: 'NonExistentStatus',
    })
    assert.equal(invalidStatusApp.success, false)
  })
})
