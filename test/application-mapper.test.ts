import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  toFrontendApplication,
  toBackendCreatePayload,
  toBackendUpdatePayload,
  toDateOnlyString,
  toBackendIsoDate,
} from '../src/lib/application-mapper.ts'
import type { BackendApplication } from '../src/types/application.ts'
import type { JobApplication } from '../src/types/dashboard.ts'

describe('Application Data Mapper Layer', () => {
  const backendSample: BackendApplication = {
    id: 'backend-uuid-1',
    userId: 'user-uuid-1',
    company: 'Stripe',
    jobTitle: 'Staff Backend Engineer',
    status: 'INTERVIEW',
    location: 'San Francisco, CA',
    workplaceType: 'ON_SITE',
    employmentType: 'FULL_TIME',
    jobUrl: 'https://stripe.com/jobs/1',
    minSalary: 180000,
    maxSalary: 230000,
    salary: '$180k - $230k',
    appliedAt: '2026-10-12T00:00:00.000Z',
    followUpDate: '2026-10-25T14:30:00.000Z',
    notes: 'Technical screen done',
    createdAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-14T11:00:00.000Z',
  }

  describe('toFrontendApplication', () => {
    test('maps backend record to frontend JobApplication with exact enum values and field names', () => {
      const frontend = toFrontendApplication(backendSample)

      assert.equal(frontend.id, 'backend-uuid-1')
      assert.equal(frontend.company, 'Stripe')
      assert.equal(frontend.role, 'Staff Backend Engineer')
      assert.equal(frontend.status, 'Interview')
      assert.equal(frontend.workplaceType, 'On-site')
      assert.equal(frontend.employmentType, 'Full-time')
      assert.equal(frontend.location, 'San Francisco, CA')
      assert.equal(frontend.jobUrl, 'https://stripe.com/jobs/1')
      assert.equal(frontend.minSalary, 180000)
      assert.equal(frontend.maxSalary, 230000)
      assert.equal(frontend.salary, '$180k - $230k')
      assert.equal(frontend.appliedDate, '2026-10-12')
      assert.equal(frontend.followUpDate, '2026-10-25')
      assert.equal(frontend.notes, 'Technical screen done')
    })

    test('handles null backend fields gracefully by converting to undefined', () => {
      const minimalBackend: BackendApplication = {
        id: 'backend-uuid-2',
        userId: 'user-uuid-1',
        company: 'Vercel',
        jobTitle: 'Frontend Engineer',
        status: 'SAVED',
        location: null,
        workplaceType: 'REMOTE',
        employmentType: null,
        jobUrl: null,
        minSalary: null,
        maxSalary: null,
        salary: null,
        appliedAt: null,
        followUpDate: null,
        notes: null,
        createdAt: '2026-10-15T00:00:00.000Z',
        updatedAt: '2026-10-15T00:00:00.000Z',
      }

      const frontend = toFrontendApplication(minimalBackend)

      assert.equal(frontend.id, 'backend-uuid-2')
      assert.equal(frontend.company, 'Vercel')
      assert.equal(frontend.role, 'Frontend Engineer')
      assert.equal(frontend.status, 'Saved')
      assert.equal(frontend.workplaceType, 'Remote')
      assert.equal(frontend.employmentType, undefined)
      assert.equal(frontend.location, undefined)
      assert.equal(frontend.jobUrl, undefined)
      assert.equal(frontend.minSalary, undefined)
      assert.equal(frontend.maxSalary, undefined)
      assert.equal(frontend.appliedDate, '2026-10-15') // falls back to createdAt date
      assert.equal(frontend.followUpDate, undefined)
      assert.equal(frontend.notes, undefined)
    })
  })

  describe('toBackendCreatePayload', () => {
    test('maps frontend JobApplication to backend creation payload', () => {
      const frontendInput: Omit<JobApplication, 'id'> = {
        company: ' Figma ',
        role: ' Product Engineer ',
        status: 'Offer',
        workplaceType: 'Hybrid',
        employmentType: 'Contract',
        location: 'New York, NY',
        jobUrl: 'https://figma.com/careers/2',
        minSalary: 160000,
        maxSalary: 190000,
        salary: '$160k - $190k',
        appliedDate: '2026-10-10',
        followUpDate: '2026-10-20',
        notes: 'Reviewing offer letter',
      }

      const payload = toBackendCreatePayload(frontendInput)

      assert.equal(payload.company, 'Figma')
      assert.equal(payload.jobTitle, 'Product Engineer')
      assert.equal(payload.status, 'OFFER')
      assert.equal(payload.workplaceType, 'HYBRID')
      assert.equal(payload.employmentType, 'CONTRACT')
      assert.equal(payload.location, 'New York, NY')
      assert.equal(payload.jobUrl, 'https://figma.com/careers/2')
      assert.equal(payload.minSalary, 160000)
      assert.equal(payload.maxSalary, 190000)
      assert.equal(payload.appliedAt, '2026-10-10T00:00:00.000Z')
      assert.equal(payload.followUpDate, '2026-10-20T00:00:00.000Z')
      assert.equal(payload.notes, 'Reviewing offer letter')
    })

    test('normalizes optional fields to null for backend storage', () => {
      const frontendInput: Omit<JobApplication, 'id'> = {
        company: 'Google',
        role: 'Site Reliability Engineer',
        status: 'Applied',
        workplaceType: 'Remote',
        appliedDate: '2026-10-18',
      }

      const payload = toBackendCreatePayload(frontendInput)

      assert.equal(payload.company, 'Google')
      assert.equal(payload.jobTitle, 'Site Reliability Engineer')
      assert.equal(payload.status, 'APPLIED')
      assert.equal(payload.location, null)
      assert.equal(payload.employmentType, null)
      assert.equal(payload.jobUrl, null)
      assert.equal(payload.minSalary, null)
      assert.equal(payload.maxSalary, null)
      assert.equal(payload.followUpDate, null)
      assert.equal(payload.notes, null)
    })
  })

  describe('toBackendUpdatePayload', () => {
    test('maps only defined fields and preserves omitted fields as undefined', () => {
      const updateData: Partial<JobApplication> = {
        status: 'Screening',
        notes: 'Recruiter phone screen passed',
      }

      const payload = toBackendUpdatePayload(updateData)

      assert.equal(payload.status, 'SCREENING')
      assert.equal(payload.notes, 'Recruiter phone screen passed')
      // Omitted fields must be undefined so PATCH does not overwrite them in database
      assert.equal(payload.company, undefined)
      assert.equal(payload.jobTitle, undefined)
      assert.equal(payload.location, undefined)
      assert.equal(payload.workplaceType, undefined)
      assert.equal(payload.employmentType, undefined)
      assert.equal(payload.minSalary, undefined)
      assert.equal(payload.maxSalary, undefined)
    })

    test('correctly maps role to jobTitle in partial update', () => {
      const updateData: Partial<JobApplication> = {
        role: 'Senior Staff Engineer',
      }

      const payload = toBackendUpdatePayload(updateData)

      assert.equal(payload.jobTitle, 'Senior Staff Engineer')
      assert.equal(payload.company, undefined)
    })
  })

  describe('Timezone-Safe Date Handling', () => {
    test('preserves date-only strings without calendar day shifts', () => {
      const dateStr = '2026-10-22'
      const iso = toBackendIsoDate(dateStr)
      assert.equal(iso, '2026-10-22T00:00:00.000Z')

      const dateOnly = toDateOnlyString(iso)
      assert.equal(dateOnly, '2026-10-22')
    })

    test('extracts date from complex ISO timestamp safely', () => {
      const complexTimestamp = '2026-12-31T23:59:59.999Z'
      const dateOnly = toDateOnlyString(complexTimestamp)
      assert.equal(dateOnly, '2026-12-31')
    })

    test('handles empty or null date values safely', () => {
      assert.equal(toDateOnlyString(null), '')
      assert.equal(toDateOnlyString(undefined), '')
      assert.equal(toBackendIsoDate(null), null)
      assert.equal(toBackendIsoDate(''), null)
    })
  })
})
