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
              picture: 'https://lh3.googleusercontent.com/a/mock-avatar-123',
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
      assert.equal(data.user.avatarUrl, 'https://lh3.googleusercontent.com/a/mock-avatar-123')
      const cookie = res.headers.get('set-cookie')
      assert.ok(cookie && cookie.includes('applyflow_session'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('POST /api/auth/register and /login handles email & password flow correctly', async () => {
    const email = `test_flow_${Date.now()}@example.com`
    const password = 'StrongPassword123!'
    const name = 'Flow Test User'

    // 1. Register
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    assert.equal(regRes.status, 201)
    const regData = await regRes.json()
    assert.ok(regData.user)
    assert.equal(regData.user.email, email)
    assert.equal(regData.user.name, name)
    const regCookie = regRes.headers.get('set-cookie')
    assert.ok(regCookie && regCookie.includes('applyflow_session'))

    // 2. Login with correct password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    assert.equal(loginRes.status, 200)
    const loginData = await loginRes.json()
    assert.equal(loginData.user.email, email)

    // 3. Login with wrong password returns 401
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'IncorrectPassword999!' }),
    })
    assert.equal(badLoginRes.status, 401)
    const badData = await badLoginRes.json()
    assert.equal(badData.error, 'Unauthorized')

    // 4. Login with non-existent email returns 401
    const noUserRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_user_9999@example.com', password: 'SomePassword123!' }),
    })
    assert.equal(noUserRes.status, 401)
  })

  test('POST /api/auth/forgot-password and /reset-password completes full reset lifecycle', async () => {
    const email = `reset_flow_${Date.now()}@example.com`
    const originalPassword = 'OriginalPassword123!'
    const newPassword = 'NewSecretPassword456!'

    // Register test user
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reset User', email, password: originalPassword }),
    })
    assert.equal(regRes.status, 201)

    // Request reset for non-existent email returns 200 without leaking token
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_account_xyz@example.com' }),
    })
    assert.equal(nonExistentRes.status, 200)
    const nonExistentData = await nonExistentRes.json()
    assert.equal(nonExistentData.resetToken, undefined)

    // Request reset for real user returns valid resetToken
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    assert.equal(forgotRes.status, 200)
    const forgotData = await forgotRes.json()
    assert.ok(forgotData.resetToken)
    const token = forgotData.resetToken

    // Confirming invalid token returns 400
    const invalidConfirmRes = await fetch(`${baseUrl}/api/auth/confirm-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bogus_invalid_token' }),
    })
    assert.equal(invalidConfirmRes.status, 400)
    const invalidConfirmData = await invalidConfirmRes.json()
    assert.equal(invalidConfirmData.valid, false)

    // Confirming valid token returns 200 with matching email
    const validConfirmRes = await fetch(`${baseUrl}/api/auth/confirm-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    assert.equal(validConfirmRes.status, 200)
    const validConfirmData = await validConfirmRes.json()
    assert.equal(validConfirmData.valid, true)
    assert.equal(validConfirmData.email, email)

    // Submitting invalid reset token returns 400
    const invalidResetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_malformed_token_12345', newPassword }),
    })
    assert.equal(invalidResetRes.status, 400)

    // Reset password with valid token succeeds and clears session
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })
    assert.equal(resetRes.status, 200)
    const resetData = (await resetRes.json()) as { message: string; email?: string }
    assert.equal(resetData.email, email)

    // Old password no longer works
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: originalPassword }),
    })
    assert.equal(oldLoginRes.status, 401)

    // New password works
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })
    assert.equal(newLoginRes.status, 200)

    // Reusing the same reset token is rejected (single-use guarantee)
    const reuseTokenRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: 'AnotherPassword789!' }),
    })
    assert.equal(reuseTokenRes.status, 400)
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
