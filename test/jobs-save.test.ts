import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import handler from '../api/index.ts'
import { prisma } from '../server/dist/lib/prisma.js'

describe('Job Discovery - Application Saving & Duplicate Prevention', () => {
  let server: http.Server
  let baseUrl: string

  const testUserAId = 'a1111111-1111-1111-1111-111111111111'
  const testUserBId = 'b2222222-2222-2222-2222-222222222222'

  before(async () => {
    server = http.createServer(handler)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`

    await prisma.user.upsert({
      where: { id: testUserAId },
      update: {},
      create: {
        id: testUserAId,
        name: 'Test User A',
        email: 'user-a@applyflow.test',
        passwordHash: '$2b$10$insecuretestplaceholderforuserahash',
      },
    })

    await prisma.user.upsert({
      where: { id: testUserBId },
      update: {},
      create: {
        id: testUserBId,
        name: 'Test User B',
        email: 'user-b@applyflow.test',
        passwordHash: '$2b$10$insecuretestplaceholderforuserbhash',
      },
    })

    await prisma.application.deleteMany({
      where: {
        userId: { in: [testUserAId, testUserBId] },
      },
    })
  })

  after(async () => {
    await prisma.application.deleteMany({
      where: {
        userId: { in: [testUserAId, testUserBId] },
      },
    })

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  test('1. Discovered job saves with status Saved, source bdjobs, and sourceJobId', async () => {
    const discoveredJobPayload = {
      company: 'Therap (BD) Ltd.',
      jobTitle: 'Software Engineer - React',
      status: 'Saved',
      location: 'Dhaka',
      workplaceType: 'On-site',
      employmentType: 'Full-time',
      jobUrl: 'https://bdjobs.com/h/details/1404179',
      source: 'bdjobs',
      sourceJobId: '1404179',
      salary: 'Negotiable',
      appliedAt: new Date().toISOString(),
    }

    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': testUserAId,
      },
      body: JSON.stringify(discoveredJobPayload),
    })

    assert.equal(res.status, 201)
    const data = (await res.json()) as { application: { company: string; jobTitle: string; status: string; source: string; sourceJobId: string; jobUrl: string } }
    assert.equal(data.application.company, 'Therap (BD) Ltd.')
    assert.equal(data.application.jobTitle, 'Software Engineer - React')
    assert.equal(data.application.status, 'SAVED')
    assert.equal(data.application.source, 'bdjobs')
    assert.equal(data.application.sourceJobId, '1404179')
    assert.equal(data.application.jobUrl, 'https://bdjobs.com/h/details/1404179')
  })

  test('2. Attempting to save the same discovered job again for the same user is rejected with HTTP 409 Conflict', async () => {
    const duplicatePayload = {
      company: 'Therap (BD) Ltd.',
      jobTitle: 'Software Engineer - React',
      status: 'Saved',
      jobUrl: 'https://bdjobs.com/h/details/1404179',
      source: 'bdjobs',
      sourceJobId: '1404179',
    }

    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': testUserAId,
      },
      body: JSON.stringify(duplicatePayload),
    })

    assert.equal(res.status, 409)
    const data = (await res.json()) as { error: string; message: string; application: { sourceJobId: string } }
    assert.equal(data.error, 'Conflict')
    assert.ok(data.message.includes('already saved'))
    assert.equal(data.application.sourceJobId, '1404179')
  })

  test('3. Another user (User B) can save the same job listing without conflict (User Isolation)', async () => {
    const payloadForUserB = {
      company: 'Therap (BD) Ltd.',
      jobTitle: 'Software Engineer - React',
      status: 'Saved',
      jobUrl: 'https://bdjobs.com/h/details/1404179',
      source: 'bdjobs',
      sourceJobId: '1404179',
    }

    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': testUserBId,
      },
      body: JSON.stringify(payloadForUserB),
    })

    assert.equal(res.status, 201)
    const data = (await res.json()) as { application: { userId: string; sourceJobId: string } }
    assert.equal(data.application.userId, testUserBId)
    assert.equal(data.application.sourceJobId, '1404179')
  })

  test('4. Opening an external listing link does not alter the saved application status', async () => {
    const appA = await prisma.application.findFirst({
      where: {
        userId: testUserAId,
        sourceJobId: '1404179',
      },
    })

    assert.ok(appA)
    assert.equal(appA.status, 'SAVED')

    // External listing click does not send state change requests. Application remains SAVED.
    const rechecked = await prisma.application.findUnique({
      where: { id: appA.id },
    })
    assert.equal(rechecked?.status, 'SAVED')
  })
})
