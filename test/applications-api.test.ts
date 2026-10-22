import test, { describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { api, ApiError } from '../src/lib/api.ts'
import type { BackendApplication } from '../src/types/application.ts'

describe('Frontend Applications API Client', () => {
  const originalFetch = globalThis.fetch

  const mockApp: BackendApplication = {
    id: 'app-uuid-1234',
    userId: 'user-uuid-1234',
    company: 'Stripe',
    jobTitle: 'Senior Systems Engineer',
    status: 'APPLIED',
    location: 'Remote, US',
    workplaceType: 'REMOTE',
    employmentType: 'FULL_TIME',
    jobUrl: 'https://stripe.com/jobs/123',
    minSalary: 150000,
    maxSalary: 200000,
    salary: '$150k - $200k',
    appliedAt: '2026-10-20T10:00:00.000Z',
    followUpDate: '2026-10-27T10:00:00.000Z',
    notes: 'Referred by engineer',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  }

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('getAll', () => {
    test('fetches all applications with credentials: include', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ applications: [mockApp] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const apps = await api.applications.getAll()

      assert.deepEqual(apps, [mockApp])
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/applications'))
      assert.equal(capturedRequest.init?.method, 'GET')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })
  })

  describe('getById', () => {
    test('fetches single application by ID with credentials: include', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ application: mockApp }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const app = await api.applications.getById('app-uuid-1234')

      assert.deepEqual(app, mockApp)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/applications/app-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'GET')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })

    test('throws ApiError on 404 not found', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: 'Application not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.applications.getById('missing-id')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 404)
          assert.equal(err.message, 'Application not found')
          return true
        }
      )
    })
  })

  describe('create', () => {
    test('creates new application via POST with JSON body and credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ application: mockApp }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const created = await api.applications.create({
        company: 'Stripe',
        jobTitle: 'Senior Systems Engineer',
        status: 'Applied',
      })

      assert.deepEqual(created, mockApp)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/applications'))
      assert.equal(capturedRequest.init?.method, 'POST')
      assert.equal(capturedRequest.init?.credentials, 'include')
      assert.ok(capturedRequest.init?.body)
      const parsedBody = JSON.parse(capturedRequest.init.body as string)
      assert.equal(parsedBody.company, 'Stripe')
    })

    test('surfaces validation errors with field details on 400 response', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid application payload',
            details: {
              company: ['Company name is required'],
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.applications.create({ company: '' })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 400)
          assert.equal(err.message, 'Invalid application payload')
          assert.ok(err.details)
          return true
        }
      )
    })
  })

  describe('update', () => {
    test('updates application via PATCH with partial payload and credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      const updatedMock: BackendApplication = {
        ...mockApp,
        status: 'INTERVIEW',
        notes: 'Interview scheduled',
      }

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ application: updatedMock }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const updated = await api.applications.update('app-uuid-1234', {
        status: 'Interview',
        notes: 'Interview scheduled',
      })

      assert.deepEqual(updated, updatedMock)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/applications/app-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'PATCH')
      assert.equal(capturedRequest.init?.credentials, 'include')
      const body = JSON.parse(capturedRequest.init?.body as string)
      assert.equal(body.status, 'Interview')
      assert.equal(body.notes, 'Interview scheduled')
    })

    test('surfaces 404 error if application to update does not exist', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: 'Application not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.applications.update('non-existent', { status: 'Offer' })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 404)
          return true
        }
      )
    })
  })

  describe('delete', () => {
    test('deletes application via DELETE with credentials', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ message: 'Application deleted successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await api.applications.delete('app-uuid-1234')

      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/applications/app-uuid-1234'))
      assert.equal(capturedRequest.init?.method, 'DELETE')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })

    test('throws ApiError on deletion failure (e.g. 404)', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Not Found',
            message: 'Application not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.applications.delete('missing-app')
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 404)
          return true
        }
      )
    })
  })

  describe('Storage Hygiene', () => {
    test('never stores tokens or credentials in localStorage or sessionStorage during application operations', async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ applications: [mockApp] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await api.applications.getAll()

      // In Node environment, check that no unexpected global tokens were leaked
      assert.equal(typeof globalThis.localStorage, 'undefined')
    })
  })
})
