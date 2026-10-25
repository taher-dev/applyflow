import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import dotenv from 'dotenv'

// Load .env.local variables
const envLocalPath = path.resolve('.env.local')
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'))
  for (const [key, value] of Object.entries(envConfig)) {
    process.env[key] = value
  }
}

// Import app after env variables are populated
const { app } = await import('../server/dist/app.js')
const { prisma } = await import('../server/dist/lib/prisma.js')

describe('Neon Cloud PostgreSQL Service End-to-End Verification', () => {
  let server: http.Server
  let baseUrl: string
  const testEmail = `neon.test.${Date.now()}@example.com`
  const testPassword = 'Password123!'
  let sessionCookie: string
  let createdAppId: string
  let createdInterviewId: string

  before(async () => {
    server = http.createServer(app)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  after(async () => {
    // Clean up test user and cascade records from Neon database
    try {
      await prisma.user.deleteMany({ where: { email: testEmail } })
    } catch {
      // Ignore cleanup error
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  test('1. Neon Database Connection Probe', async () => {
    const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`
    assert.equal(result.length, 1)
    assert.equal(result[0].result, 1)
  })

  test('2. Register new user in Neon PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Neon Test User',
        email: testEmail,
        password: testPassword,
      }),
    })

    assert.equal(res.status, 201)
    const data = await res.json()
    assert.equal(data.user.email, testEmail)
    assert.ok(data.user.id)

    const cookieHeader = res.headers.get('set-cookie')
    assert.ok(cookieHeader)
    assert.match(cookieHeader, /applyflow_session=/)
    sessionCookie = cookieHeader.split(';')[0]
  })

  test('3. Query /api/auth/me with session cookie from Neon', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.user.email, testEmail)
  })

  test('4. Create job application in Neon PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        company: 'Stripe',
        jobTitle: 'Backend Engineer',
        status: 'APPLIED',
        location: 'Remote',
      }),
    })

    assert.equal(res.status, 201)
    const data = await res.json()
    assert.equal(data.application.company, 'Stripe')
    assert.equal(data.application.status, 'APPLIED')
    createdAppId = data.application.id
    assert.ok(createdAppId)
  })

  test('5. Retrieve applications from Neon PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/applications`, {
      headers: { Cookie: sessionCookie },
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data.applications))
    const found = data.applications.find((a: { id: string }) => a.id === createdAppId)
    assert.ok(found)
    assert.equal(found.company, 'Stripe')
  })

  test('6. Schedule interview in Neon PostgreSQL', async () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString()
    const res = await fetch(`${baseUrl}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        applicationId: createdAppId,
        scheduledAt,
        type: 'TECHNICAL_INTERVIEW',
        interviewer: 'Alex Tech Lead',
      }),
    })

    assert.equal(res.status, 201)
    const data = await res.json()
    assert.equal(data.interview.applicationId, createdAppId)
    assert.equal(data.interview.interviewer, 'Alex Tech Lead')
    createdInterviewId = data.interview.id
    assert.ok(createdInterviewId)
  })

  test('7. Update application status in Neon PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/applications/${createdAppId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        status: 'INTERVIEW',
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.application.status, 'INTERVIEW')
  })

  test('8. Delete application with cascade interview cleanup in Neon', async () => {
    const deleteRes = await fetch(`${baseUrl}/api/applications/${createdAppId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    })

    assert.equal(deleteRes.status, 200)

    // Verify interview was cascade deleted
    const interviewRes = await fetch(`${baseUrl}/api/interviews/${createdInterviewId}`, {
      headers: { Cookie: sessionCookie },
    })
    assert.equal(interviewRes.status, 404)
  })
})
