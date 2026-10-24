import test, { describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { api, ApiError } from '../src/lib/api.ts'
import type { BackendInterview } from '../src/types/interview.ts'
import {
  toFrontendInterview,
  toBackendInterviewCreatePayload,
  toBackendInterviewUpdatePayload,
} from '../src/lib/application-mapper.ts'
import type { Interview } from '../src/types/dashboard.ts'

describe('Frontend Interviews API Client & Mapper Layer', () => {
  const originalFetch = globalThis.fetch

  const mockBackendInterview: BackendInterview = {
    id: 'int-uuid-1234',
    applicationId: 'app-uuid-5678',
    scheduledAt: '2026-10-25T14:00:00.000Z',
    type: 'TECHNICAL_INTERVIEW',
    locationOrLink: 'https://meet.google.com/abc-def-ghi',
    interviewer: 'Sarah Kim',
    notes: 'Review system design concepts',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    application: {
      id: 'app-uuid-5678',
      company: 'Acme Corp',
      jobTitle: 'Senior Fullstack Engineer',
      status: 'INTERVIEW',
    },
  }

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('getAll', () => {
    test('fetches all interviews with credentials: include', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ interviews: [mockBackendInterview] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const interviews = await api.interviews.getAll()

      assert.deepEqual(interviews, [mockBackendInterview])
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/interviews'))
      assert.equal(capturedRequest.init?.method, 'GET')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })
  })

  describe('getById', () => {
    test('fetches single interview by ID with credentials: include', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ interview: mockBackendInterview }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const interview = await api.interviews.getById('int-uuid-1234')

      assert.deepEqual(interview, mockBackendInterview)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/interviews/int-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'GET')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })

    test('throws ApiError on 404 not found', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: 'Interview not found',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      await assert.rejects(
        async () => {
          await api.interviews.getById('missing-uuid')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 404)
          assert.equal(err.message, 'Interview not found')
          return true
        }
      )
    })
  })

  describe('create', () => {
    test('creates new interview via POST with JSON body and credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ interview: mockBackendInterview }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const payload = {
        applicationId: 'app-uuid-5678',
        scheduledAt: '2026-10-25T14:00:00.000Z',
        type: 'TECHNICAL_INTERVIEW',
        locationOrLink: 'https://meet.google.com/abc-def-ghi',
        interviewer: 'Sarah Kim',
        notes: 'Review system design concepts',
      }

      const created = await api.interviews.create(payload)

      assert.deepEqual(created, mockBackendInterview)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/interviews'))
      assert.equal(capturedRequest.init?.method, 'POST')
      assert.equal(capturedRequest.init?.credentials, 'include')
      assert.equal(capturedRequest.init?.body, JSON.stringify(payload))
    })

    test('surfaces validation errors with field details on 400 response', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid interview data',
            details: { scheduledAt: ['Invalid scheduled date and time format'] },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      await assert.rejects(
        async () => {
          await api.interviews.create({
            applicationId: 'app-uuid-5678',
            scheduledAt: 'not-a-date',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 400)
          assert.equal(err.message, 'Invalid interview data')
          assert.deepEqual(err.details, {
            scheduledAt: ['Invalid scheduled date and time format'],
          })
          return true
        }
      )
    })
  })

  describe('update', () => {
    test('updates interview via PATCH with partial payload and credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(
          JSON.stringify({
            interview: {
              ...mockBackendInterview,
              interviewer: 'Dr. Jane Smith',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const updatePayload = { interviewer: 'Dr. Jane Smith' }
      const updated = await api.interviews.update('int-uuid-1234', updatePayload)

      assert.equal(updated.interviewer, 'Dr. Jane Smith')
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/interviews/int-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'PATCH')
      assert.equal(capturedRequest.init?.credentials, 'include')
      assert.equal(capturedRequest.init?.body, JSON.stringify(updatePayload))
    })
  })

  describe('delete', () => {
    test('deletes interview via DELETE with credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ message: 'Interview deleted successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await api.interviews.delete('int-uuid-1234')

      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/interviews/int-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'DELETE')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })
  })

  describe('Data Mapper Layer', () => {
    test('toFrontendInterview maps BackendInterview to frontend Interview correctly', () => {
      const frontend = toFrontendInterview(mockBackendInterview)

      assert.equal(frontend.id, 'int-uuid-1234')
      assert.equal(frontend.applicationId, 'app-uuid-5678')
      assert.equal(frontend.scheduledAt, '2026-10-25T14:00:00.000Z')
      assert.equal(frontend.interviewType, 'Technical interview')
      assert.equal(frontend.locationOrLink, 'https://meet.google.com/abc-def-ghi')
      assert.equal(frontend.interviewer, 'Sarah Kim')
      assert.equal(frontend.notes, 'Review system design concepts')
    })

    test('toBackendInterviewCreatePayload maps frontend input to backend payload', () => {
      const input: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'> = {
        applicationId: 'app-uuid-5678',
        scheduledAt: '2026-10-25T14:00',
        interviewType: 'Final interview',
        locationOrLink: '  https://zoom.us/j/12345  ',
        interviewer: ' Alex Morgan ',
        notes: ' Bring portfolio ',
      }

      const backendPayload = toBackendInterviewCreatePayload(input)

      assert.equal(backendPayload.applicationId, 'app-uuid-5678')
      assert.equal(backendPayload.scheduledAt, '2026-10-25T14:00')
      assert.equal(backendPayload.type, 'FINAL_INTERVIEW')
      assert.equal(backendPayload.locationOrLink, 'https://zoom.us/j/12345')
      assert.equal(backendPayload.interviewer, 'Alex Morgan')
      assert.equal(backendPayload.notes, 'Bring portfolio')
    })

    test('toBackendInterviewUpdatePayload creates clean partial update payload', () => {
      const input: Partial<Interview> = {
        interviewer: ' New Interviewer ',
        interviewType: 'Phone screening',
      }

      const updatePayload = toBackendInterviewUpdatePayload(input)

      assert.equal(updatePayload.interviewer, 'New Interviewer')
      assert.equal(updatePayload.type, 'PHONE_SCREENING')
      assert.equal(updatePayload.applicationId, undefined)
      assert.equal(updatePayload.scheduledAt, undefined)
    })
  })
})
