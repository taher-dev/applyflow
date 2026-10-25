import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import handler, { app } from '../api/index.ts'
import catchAllHandler from '../api/[...all].ts'

describe('Vercel Serverless Function & Deployment API Entrypoint', () => {
  let server: http.Server
  let baseUrl: string

  before(async () => {
    server = http.createServer(handler)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  test('handler exports app instance and default request handler function', () => {
    assert.equal(typeof handler, 'function')
    assert.equal(typeof catchAllHandler, 'function')
    assert.equal(typeof app, 'function')
  })

  test('GET /api/health responds with 200 and { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok' })
  })

  test('GET /health (simulating stripped /api prefix by Vercel rewrite) automatically normalizes to /api/health', async () => {
    const res = await fetch(`${baseUrl}/health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok' })
  })

  test('GET /api responds with 200 and API status message', async () => {
    const res = await fetch(`${baseUrl}/api`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.status, 'ok')
    assert.equal(data.message, 'ApplyFlow API is running')
  })

  test('GET /api/index?__vercel_path=health resolves to /api/health and responds 200', async () => {
    const res = await fetch(`${baseUrl}/api/index?__vercel_path=health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok' })
  })

  test('GET /api/index?__vercel_path=auth/me resolves to /api/auth/me and responds 401 without session', async () => {
    const res = await fetch(`${baseUrl}/api/index?__vercel_path=auth/me`)
    assert.equal(res.status, 401)
    const data = await res.json()
    assert.equal(data.error, 'Unauthorized')
  })

  test('POST /api/auth/google responds with 200 and sets session cookie in demo mode', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.user)
    assert.equal(data.user.email, 'demo.google@applyflow.app')
    const cookie = res.headers.get('set-cookie')
    assert.ok(cookie && cookie.includes('applyflow_session'))
  })

  test('POST /api/auth/google with invalid credential returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential: 'invalid-fake-token' }),
    })
    assert.equal(res.status, 401)
    const data = await res.json()
    assert.equal(data.error, 'Unauthorized')
  })

  test('POST /api/auth/google with verified Google token creates real user session', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input)
        if (urlStr.includes('oauth2.googleapis.com/tokeninfo')) {
          return new Response(
            JSON.stringify({
              email: 'verified.google@example.com',
              name: 'Verified User',
              email_verified: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        return originalFetch(input, init)
      }

      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: 'mock-valid-google-id-token' }),
      })
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.ok(data.user)
      assert.equal(data.user.email, 'verified.google@example.com')
      assert.equal(data.user.name, 'Verified User')
      const cookie = res.headers.get('set-cookie')
      assert.ok(cookie && cookie.includes('applyflow_session'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('non-existent endpoint returns structured 404 JSON response', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route-999`)
    assert.equal(res.status, 404)
    const data = await res.json()
    assert.equal(data.error, 'Not Found')
  })

  test('security headers are present on API responses', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
  })
})
