import test, { describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  isDemoInterview,
  detectLegacyInterviews,
  createInterviewBackupJsonString,
  getInterviewImportLedger,
  saveInterviewImportLedger,
  generateInterviewFingerprint,
  importInterviewsToCloud,
  removeImportedInterviewsFromLocalStorage,
  getInterviewLedgerStorageKey,
} from '../src/lib/local-interview-import.ts'
import { saveInterviews, loadInterviews } from '../src/lib/storage.ts'
import { saveImportLedger } from '../src/lib/local-import.ts'
import type { Interview, JobApplication } from '../src/types/dashboard.ts'
import { api } from '../src/lib/api.ts'

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

describe('Legacy Interview Migration & Verification', () => {
  const user1Id = 'user-uuid-1'
  const user2Id = 'user-uuid-2'

  const user1CloudApp1: JobApplication = {
    id: 'cloud-app-uuid-1',
    company: 'Stripe',
    role: 'Senior Frontend Engineer',
    status: 'Interview',
    workplaceType: 'Remote',
    appliedDate: '2026-10-08',
  }

  const user1CloudApp2: JobApplication = {
    id: 'cloud-app-uuid-2',
    company: 'Anthropic',
    role: 'Full Stack Engineer',
    status: 'Applied',
    workplaceType: 'Remote',
    appliedDate: '2026-10-15',
  }

  const user2CloudApp: JobApplication = {
    id: 'cloud-app-user2-99',
    company: 'Google',
    role: 'Software Engineer',
    status: 'Interview',
    workplaceType: 'Hybrid',
    appliedDate: '2026-10-10',
  }

  const demoInterview: Interview = {
    id: 'int-1',
    applicationId: 'app-1',
    scheduledAt: '2026-10-17T14:00',
    interviewType: 'Technical interview',
    locationOrLink: 'Google Meet',
    interviewer: 'David Chen (Staff Engineer)',
    notes: 'Review React 19 concurrent features',
    createdAt: '2026-10-12T09:30:00Z',
    updatedAt: '2026-10-12T09:30:00Z',
  }

  const customInterview1: Interview = {
    id: 'legacy-int-1',
    applicationId: 'cloud-app-uuid-1', // Directly references user1's cloud application
    scheduledAt: '2026-10-28T10:00:00.000Z',
    interviewType: 'Technical interview',
    locationOrLink: 'https://meet.google.com/abc-defg-hij',
    interviewer: 'Sarah Connor',
    notes: 'System design and algorithms',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  }

  const customInterview2: Interview = {
    id: 'legacy-int-2',
    applicationId: 'legacy-local-app-2', // References legacy local app ID
    scheduledAt: '2026-10-29T15:00:00.000Z',
    interviewType: 'Phone screening',
    locationOrLink: '+1 555-0199',
    interviewer: 'John recruiter',
    notes: 'Initial discussion',
    createdAt: '2026-10-20T11:00:00.000Z',
    updatedAt: '2026-10-20T11:00:00.000Z',
  }

  beforeEach(() => {
    const mockStorage = new LocalStorageMock()
    // @ts-expect-error mock window for Node test environment
    globalThis.window = { localStorage: mockStorage }
  })

  afterEach(() => {
    // @ts-expect-error cleanup window
    delete globalThis.window
  })

  describe('1. Legacy Format Parsing & Demo Identification', () => {
    test('isDemoInterview identifies template interviews from mockData', () => {
      assert.equal(isDemoInterview(demoInterview), true)
      assert.equal(isDemoInterview(customInterview1), false)
      assert.equal(isDemoInterview(customInterview2), false)
    })

    test('detectLegacyInterviews identifies demo records and separates them from user records', () => {
      saveInterviews([demoInterview, customInterview1])

      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)

      assert.equal(detection.hasLegacyData, true)
      assert.equal(detection.totalCount, 2)
      assert.equal(detection.demoCount, 1)
      assert.equal(detection.eligibleCount, 1)
      assert.equal(detection.eligibleRecords[0].legacyId, 'legacy-int-1')
    })
  })

  describe('2. Application Mapping & Remapping via Ledger', () => {
    test('resolves direct cloud application ID matches', () => {
      saveInterviews([customInterview1])

      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)

      assert.equal(detection.eligibleCount, 1)
      assert.equal(detection.eligibleRecords[0].mappedApplicationId, 'cloud-app-uuid-1')
      assert.equal(detection.eligibleRecords[0].parentApp?.company, 'Stripe')
    })

    test('resolves legacy local application ID through the application import ledger', () => {
      // Simulate that 'legacy-local-app-2' was previously imported and mapped to 'cloud-app-uuid-2'
      saveImportLedger({
        'legacy-local-app-2': 'cloud-app-uuid-2',
      })

      saveInterviews([customInterview2])

      const detection = detectLegacyInterviews([user1CloudApp1, user1CloudApp2], [], user1Id)

      assert.equal(detection.eligibleCount, 1)
      assert.equal(detection.eligibleRecords[0].mappedApplicationId, 'cloud-app-uuid-2')
      assert.equal(detection.eligibleRecords[0].parentApp?.company, 'Anthropic')
    })
  })

  describe('3. Unmappable, Invalid, and Corrupted Records Handling', () => {
    test('detects unmappable interviews when parent application does not exist in user cloud account', () => {
      const orphanedInterview: Interview = {
        id: 'orphaned-int',
        applicationId: 'completely-unknown-app-id',
        scheduledAt: '2026-10-30T14:00:00.000Z',
        interviewType: 'Final interview',
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      }

      saveInterviews([orphanedInterview])

      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)

      assert.equal(detection.eligibleCount, 0)
      assert.equal(detection.unmappableCount, 1)
      assert.equal(detection.allCategorized[0].status, 'unmappable')
      assert.match(detection.allCategorized[0].reason || '', /not found in your cloud account/)
    })

    test('detects invalid records with malformed date strings', () => {
      const invalidDateInterview: Interview = {
        id: 'invalid-date-int',
        applicationId: 'cloud-app-uuid-1',
        scheduledAt: 'not-a-valid-date-string',
        interviewType: 'Technical interview',
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      }

      saveInterviews([invalidDateInterview])

      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)

      assert.equal(detection.eligibleCount, 0)
      assert.equal(detection.invalidCount, 1)
      assert.equal(detection.allCategorized[0].status, 'invalid')
    })
  })

  describe('4. Backup Generation & Original Data Preservation', () => {
    test('createInterviewBackupJsonString produces complete valid JSON backup', () => {
      saveInterviews([customInterview1, customInterview2])

      const backupStr = createInterviewBackupJsonString()
      const parsed = JSON.parse(backupStr)

      assert.equal(parsed.version, 'applyflow-interview-backup-v1')
      assert.equal(parsed.recordCount, 2)
      assert.ok(parsed.exportedAt)
      assert.equal(parsed.interviews[0].id, 'legacy-int-1')
      assert.equal(parsed.interviews[1].id, 'legacy-int-2')
    })

    test('importing interviews to cloud does not alter original legacy localStorage data', async () => {
      saveInterviews([customInterview1])

      const originalCreate = api.interviews.create
      api.interviews.create = async () => ({
        id: 'backend-created-uuid-1',
        applicationId: customInterview1.applicationId,
        scheduledAt: customInterview1.scheduledAt,
        type: 'TECHNICAL_INTERVIEW',
        locationOrLink: customInterview1.locationOrLink || null,
        interviewer: customInterview1.interviewer || null,
        notes: customInterview1.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)
      await importInterviewsToCloud(detection.eligibleRecords, user1Id)

      // Verify that local storage still retains the exact original record intact
      const localData = loadInterviews()
      assert.ok(localData.data)
      assert.equal(localData.data.length, 1)
      assert.equal(localData.data[0].id, 'legacy-int-1')

      api.interviews.create = originalCreate
    })
  })

  describe('5. Idempotency & Repeated Imports Prevention', () => {
    test('repeated imports do not create duplicate interviews in backend or ledger', async () => {
      saveInterviews([customInterview1])

      let callCount = 0
      const originalCreate = api.interviews.create
      api.interviews.create = async () => {
        callCount++
        return {
          id: 'backend-uuid-777',
          applicationId: customInterview1.applicationId,
          scheduledAt: customInterview1.scheduledAt,
          type: 'TECHNICAL_INTERVIEW',
          locationOrLink: null,
          interviewer: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      // First run
      const detection1 = detectLegacyInterviews([user1CloudApp1], [], user1Id)
      const summary1 = await importInterviewsToCloud(detection1.eligibleRecords, user1Id)

      assert.equal(summary1.succeeded.length, 1)
      assert.equal(callCount, 1)

      // Ledger has stored mapping
      const ledger = getInterviewImportLedger(user1Id)
      assert.equal(ledger['legacy-int-1'], 'backend-uuid-777')

      // Second run: detectLegacyInterviews identifies as already_imported
      const detection2 = detectLegacyInterviews([user1CloudApp1], [], user1Id)
      assert.equal(detection2.eligibleCount, 0)
      assert.equal(detection2.alreadyImportedCount, 1)

      // If imported again, importInterviewsToCloud safely skips
      const summary2 = await importInterviewsToCloud(detection1.eligibleRecords, user1Id)
      assert.equal(summary2.skippedAlreadyImported, 1)
      assert.equal(summary2.succeeded.length, 0)
      assert.equal(callCount, 1) // No duplicate API call!

      api.interviews.create = originalCreate
    })

    test('deduplicates based on existing cloud interviews and deterministic fingerprints', () => {
      saveInterviews([customInterview1])

      // Simulate that the interview is already present in the user's cloud account
      const existingCloudInterviews: Interview[] = [
        {
          id: 'existing-cloud-int-1',
          applicationId: customInterview1.applicationId,
          scheduledAt: customInterview1.scheduledAt,
          interviewType: customInterview1.interviewType,
          interviewer: customInterview1.interviewer,
          createdAt: '2026-10-21T10:00:00.000Z',
          updatedAt: '2026-10-21T10:00:00.000Z',
        },
      ]

      const detection = detectLegacyInterviews(
        [user1CloudApp1],
        existingCloudInterviews,
        user1Id
      )

      assert.equal(detection.eligibleCount, 0)
      assert.equal(detection.alreadyImportedCount, 1)
      assert.match(detection.allCategorized[0].reason || '', /Already imported/)
    })
  })

  describe('6. Partial Failures and Safe Retries', () => {
    test('records failed records separately while persisting succeeded ones in ledger', async () => {
      saveInterviews([customInterview1, customInterview2])
      saveImportLedger({ 'legacy-local-app-2': 'cloud-app-uuid-2' })

      const originalCreate = api.interviews.create

      // Fail on customInterview2, succeed on customInterview1
      api.interviews.create = async (payload) => {
        if (payload.applicationId === 'cloud-app-uuid-2') {
          throw new Error('Database connection timed out')
        }
        return {
          id: 'backend-uuid-1',
          applicationId: payload.applicationId,
          scheduledAt: payload.scheduledAt,
          type: 'TECHNICAL_INTERVIEW',
          locationOrLink: null,
          interviewer: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      const detection = detectLegacyInterviews(
        [user1CloudApp1, user1CloudApp2],
        [],
        user1Id
      )

      const summary = await importInterviewsToCloud(detection.eligibleRecords, user1Id)

      assert.equal(summary.succeeded.length, 1)
      assert.equal(summary.succeeded[0].legacyId, 'legacy-int-1')
      assert.equal(summary.failed.length, 1)
      assert.equal(summary.failed[0].legacyId, 'legacy-int-2')
      assert.match(summary.failed[0].error, /timed out/)

      // Ledger has customInterview1 only
      const ledger = getInterviewImportLedger(user1Id)
      assert.equal(ledger['legacy-int-1'], 'backend-uuid-1')
      assert.equal(ledger['legacy-int-2'], undefined)

      // Prune succeeded records only
      removeImportedInterviewsFromLocalStorage(summary.succeeded.map((s) => s.legacyId))

      const remainingLocal = loadInterviews()
      assert.equal(remainingLocal.data?.length, 1)
      assert.equal(remainingLocal.data?.[0].id, 'legacy-int-2') // Preserved for safe retry!

      api.interviews.create = originalCreate
    })
  })

  describe('7. Multi-User Isolation & Ownership Enforcement', () => {
    test('user cannot migrate interviews pointing to an application owned by another user', () => {
      const crossUserInterview: Interview = {
        id: 'cross-user-int',
        applicationId: user2CloudApp.id, // Belongs to user2
        scheduledAt: '2026-10-30T10:00:00.000Z',
        interviewType: 'Phone screening',
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      }

      saveInterviews([crossUserInterview])

      // Current user is user1 (only owns user1CloudApp1)
      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)

      // crossUserInterview must be marked as unmappable for user1
      assert.equal(detection.eligibleCount, 0)
      assert.equal(detection.unmappableCount, 1)
      assert.equal(detection.allCategorized[0].status, 'unmappable')
    })

    test('ledgers are strictly scoped per authenticated user', () => {
      assert.equal(getInterviewLedgerStorageKey(user1Id), `applyflow_interview_ledger_v1_${user1Id}`)
      assert.equal(getInterviewLedgerStorageKey(user2Id), `applyflow_interview_ledger_v1_${user2Id}`)

      saveInterviewImportLedger({ 'legacy-int-1': 'backend-1' }, user1Id)
      saveInterviewImportLedger({ 'legacy-int-1': 'backend-2' }, user2Id)

      const ledgerUser1 = getInterviewImportLedger(user1Id)
      const ledgerUser2 = getInterviewImportLedger(user2Id)

      assert.equal(ledgerUser1['legacy-int-1'], 'backend-1')
      assert.equal(ledgerUser2['legacy-int-1'], 'backend-2')
    })
  })

  describe('8. Empty Storage and Edge Cases', () => {
    test('returns empty state when no interviews are stored', () => {
      const detection = detectLegacyInterviews([user1CloudApp1], [], user1Id)
      assert.equal(detection.hasLegacyData, false)
      assert.equal(detection.totalCount, 0)
      assert.equal(detection.eligibleCount, 0)
      assert.deepEqual(detection.eligibleRecords, [])
    })

    test('generateInterviewFingerprint generates consistent deterministic values', () => {
      const fp1 = generateInterviewFingerprint('app-1', '2026-10-25T14:00', 'Phone screening', 'Alice')
      const fp2 = generateInterviewFingerprint('app-1', '2026-10-25T14:00', 'Phone screening', 'Alice')
      const fp3 = generateInterviewFingerprint('app-1', '2026-10-25T14:00', 'Technical interview', 'Alice')

      assert.equal(fp1, fp2)
      assert.notEqual(fp1, fp3)
    })
  })
})
