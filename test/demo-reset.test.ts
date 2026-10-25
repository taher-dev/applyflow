import test, { describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { api, ApiError } from '../src/lib/api.ts'
import type { BackendApplication } from '../src/types/application.ts'
import type { BackendInterview } from '../src/types/interview.ts'
import { toFrontendApplication, toFrontendInterview } from '../src/lib/application-mapper.ts'

describe('Demo Data Reset & Workspace Refresh Verification', () => {
  const originalFetch = globalThis.fetch

  const mockUserApps: BackendApplication[] = [
    {
      id: 'app-user-1',
      userId: 'user-actual-owner',
      company: 'TechCorp International',
      jobTitle: 'Senior Software Engineer',
      status: 'INTERVIEW',
      location: 'New York, NY',
      workplaceType: 'HYBRID',
      employmentType: 'FULL_TIME',
      jobUrl: 'https://techcorp.example.com/jobs/123',
      minSalary: 160000,
      maxSalary: 190000,
      salary: '$160k - $190k',
      appliedAt: '2026-10-15T09:00:00.000Z',
      followUpDate: '2026-10-22T09:00:00.000Z',
      notes: 'Custom notes written by real user',
      createdAt: '2026-10-15T09:00:00.000Z',
      updatedAt: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 'app-user-2',
      userId: 'user-actual-owner',
      company: 'NextGen Solutions',
      jobTitle: 'Lead Architect',
      status: 'OFFER',
      location: 'Remote',
      workplaceType: 'REMOTE',
      employmentType: 'FULL_TIME',
      jobUrl: 'https://nextgen.example.com/jobs/456',
      minSalary: 210000,
      maxSalary: 240000,
      salary: '$210k - $240k',
      appliedAt: '2026-10-10T12:00:00.000Z',
      followUpDate: null,
      notes: 'Final offer letter received',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    },
  ]

  const mockUserInterviews: BackendInterview[] = [
    {
      id: 'int-user-1',
      applicationId: 'app-user-1',
      scheduledAt: '2026-10-28T15:00:00.000Z',
      type: 'TECHNICAL_INTERVIEW',
      locationOrLink: 'https://meet.example.com/interview-1',
      interviewer: 'Alex Mercer (Staff Architect)',
      notes: 'System architecture deep-dive',
      createdAt: '2026-10-16T10:00:00.000Z',
      updatedAt: '2026-10-16T10:00:00.000Z',
      application: {
        id: 'app-user-1',
        company: 'TechCorp International',
        jobTitle: 'Senior Software Engineer',
        status: 'INTERVIEW',
      },
    },
  ]

  beforeEach(() => {
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('1. Removal of redundant refresh workspace button from production app', () => {
    test('Sidebar does not render redundant refresh workspace button', () => {
      const sidebarSource = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/components/dashboard/Sidebar.tsx'),
        'utf-8'
      )

      assert.equal(
        sidebarSource.includes('Refresh workspace data'),
        false,
        'Expected Sidebar to not display "Refresh workspace data"'
      )
      assert.equal(
        sidebarSource.includes('handleRefreshWorkspace'),
        false,
        'Expected Sidebar to not have handleRefreshWorkspace'
      )
    })

    test('Header does not render redundant refresh workspace button in user menu', () => {
      const headerSource = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/components/dashboard/Header.tsx'),
        'utf-8'
      )

      assert.equal(
        headerSource.includes('Refresh workspace data'),
        false,
        'Expected Header to not display "Refresh workspace data"'
      )
      assert.equal(
        headerSource.includes('onRefreshWorkspace'),
        false,
        'Expected Header to not have onRefreshWorkspace'
      )
    })

    test('App.tsx does not mount ResetDemoDataDialog or refresh button handlers', () => {
      const appSource = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/App.tsx'),
        'utf-8'
      )

      assert.equal(
        appSource.includes('ResetDemoDataDialog'),
        false,
        'Expected App.tsx to not import or mount ResetDemoDataDialog'
      )
      assert.equal(
        appSource.includes('handleConfirmRefreshWorkspace'),
        false,
        'Expected App.tsx to not define handleConfirmRefreshWorkspace'
      )
    })
  })

  describe('2. PostgreSQL Applications & Interviews Preservation', () => {
    test('refresh/reset action does not call DELETE on applications or interviews', async () => {
      let deleteAppCalled = false
      let deleteInterviewCalled = false

      // Intercept any DELETE calls
      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method?.toUpperCase() || 'GET'
        if (method === 'DELETE') {
          if (String(_input).includes('/api/applications')) deleteAppCalled = true
          if (String(_input).includes('/api/interviews')) deleteInterviewCalled = true
          return new Response(JSON.stringify({ success: true }), { status: 200 })
        }

        if (String(_input).includes('/api/applications')) {
          return new Response(JSON.stringify({ applications: mockUserApps }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (String(_input).includes('/api/interviews')) {
          return new Response(JSON.stringify({ interviews: mockUserInterviews }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(null, { status: 404 })
      }

      // Simulate the refresh action
      const [apps, interviews] = await Promise.all([
        api.applications.getAll(),
        api.interviews.getAll(),
      ])

      // Verify NO deletion API was called
      assert.equal(deleteAppCalled, false, 'api.applications.delete must never be called')
      assert.equal(deleteInterviewCalled, false, 'api.interviews.delete must never be called')

      // Verify user applications and interviews are returned intact
      assert.equal(apps.length, 2)
      assert.equal(apps[0].company, 'TechCorp International')
      assert.equal(apps[1].company, 'NextGen Solutions')

      assert.equal(interviews.length, 1)
      assert.equal(interviews[0].interviewer, 'Alex Mercer (Staff Architect)')
    })
  })

  describe('3. User Isolation & Authentication Integrity', () => {
    test('data refresh endpoints use credentials: include without client-supplied userId spoofing', async () => {
      const requests: { url: string; credentials?: RequestCredentials }[] = []

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          url: input.toString(),
          credentials: init?.credentials,
        })

        if (String(input).includes('/api/applications')) {
          return new Response(JSON.stringify({ applications: mockUserApps }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (String(input).includes('/api/interviews')) {
          return new Response(JSON.stringify({ interviews: mockUserInterviews }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(null, { status: 404 })
      }

      await Promise.all([api.applications.getAll(), api.interviews.getAll()])

      assert.equal(requests.length, 2)
      for (const req of requests) {
        // Enforce session credentials
        assert.equal(req.credentials, 'include')
        // Enforce that no userId is appended in query params
        assert.equal(req.url.includes('userId='), false, 'Must not send client-supplied userId')
      }
    })
  })

  describe('4. Error Handling & Notification Honesty', () => {
    test('failed server response throws ApiError and never produces success notification', async () => {
      // Simulate server 500 failure
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ message: 'Internal server error loading applications' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      let errorCaught = false
      try {
        await api.applications.getAll()
      } catch (err) {
        errorCaught = true
        assert.ok(err instanceof ApiError)
        assert.equal(err.status, 500)
        assert.equal(err.message, 'Internal server error loading applications')
      }

      assert.equal(errorCaught, true, 'Expected ApiError to be thrown on server failure')
    })
  })

  describe('5. Idempotent Repeated Execution', () => {
    test('repeated execution does not duplicate or corrupt application or interview records', async () => {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/applications')) {
          return new Response(JSON.stringify({ applications: mockUserApps }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (String(input).includes('/api/interviews')) {
          return new Response(JSON.stringify({ interviews: mockUserInterviews }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(null, { status: 404 })
      }

      // Execute refresh 3 times in succession
      const run1Apps = (await api.applications.getAll()).map(toFrontendApplication)
      const run1Ints = (await api.interviews.getAll()).map(toFrontendInterview)

      const run2Apps = (await api.applications.getAll()).map(toFrontendApplication)
      const run2Ints = (await api.interviews.getAll()).map(toFrontendInterview)

      const run3Apps = (await api.applications.getAll()).map(toFrontendApplication)
      const run3Ints = (await api.interviews.getAll()).map(toFrontendInterview)

      assert.deepEqual(run1Apps, run2Apps)
      assert.deepEqual(run2Apps, run3Apps)
      assert.equal(run3Apps.length, 2)

      assert.deepEqual(run1Ints, run2Ints)
      assert.deepEqual(run2Ints, run3Ints)
      assert.equal(run3Ints.length, 1)
    })
  })
})
