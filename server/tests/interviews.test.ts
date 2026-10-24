import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const testUserAId = 'c3333333-3333-3333-3333-333333333333'
const testUserBId = 'd4444444-4444-4444-4444-444444444444'

let userAAppId: string
let userBAppId: string

before(async () => {
  // Ensure isolated test users exist in applyflow_test database
  await prisma.user.upsert({
    where: { id: testUserAId },
    update: {},
    create: {
      id: testUserAId,
      name: 'Test Interview User A',
      email: 'interview-user-a@applyflow.test',
      passwordHash: '$2b$10$insecuretestplaceholderforuserahash',
    },
  })

  await prisma.user.upsert({
    where: { id: testUserBId },
    update: {},
    create: {
      id: testUserBId,
      name: 'Test Interview User B',
      email: 'interview-user-b@applyflow.test',
      passwordHash: '$2b$10$insecuretestplaceholderforuserbhash',
    },
  })

  // Clean test user applications & interviews before starting
  await prisma.application.deleteMany({
    where: { userId: { in: [testUserAId, testUserBId] } },
  })

  // Create an application for User A
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Acme User A Corp',
      jobTitle: 'Backend Engineer',
      status: 'APPLIED',
    },
  })
  userAAppId = appA.id

  // Create an application for User B
  const appB = await prisma.application.create({
    data: {
      userId: testUserBId,
      company: 'Beta User B LLC',
      jobTitle: 'Product Designer',
      status: 'INTERVIEW',
    },
  })
  userBAppId = appB.id
})

after(async () => {
  // Clean test user data after test execution
  await prisma.application.deleteMany({
    where: { userId: { in: [testUserAId, testUserBId] } },
  })
  await prisma.$disconnect()
})

test('1. Unauthenticated requests to /api/interviews return HTTP 401', async () => {
  const getRes = await request(app).get('/api/interviews')
  assert.equal(getRes.status, 401)
  assert.equal(getRes.body.error, 'Unauthorized')

  const postRes = await request(app)
    .post('/api/interviews')
    .send({ applicationId: userAAppId, scheduledAt: '2026-10-30T10:00:00.000Z' })
  assert.equal(postRes.status, 401)

  const patchRes = await request(app)
    .patch('/api/interviews/some-id')
    .send({ notes: 'test notes' })
  assert.equal(patchRes.status, 401)

  const deleteRes = await request(app).delete('/api/interviews/some-id')
  assert.equal(deleteRes.status, 401)
})

test('2. Authenticated user can schedule an interview for their own application', async () => {
  const response = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserAId)
    .send({
      applicationId: userAAppId,
      scheduledAt: '2026-10-30T14:00:00.000Z',
      type: 'TECHNICAL_INTERVIEW',
      locationOrLink: 'https://meet.google.com/test-room',
      interviewer: 'Alice Engineer',
      notes: 'Prepare system design architecture',
    })

  assert.equal(response.status, 201)
  assert.ok(response.body.interview)
  assert.equal(response.body.interview.applicationId, userAAppId)
  assert.equal(response.body.interview.type, 'TECHNICAL_INTERVIEW')
  assert.equal(response.body.interview.interviewer, 'Alice Engineer')
  assert.equal(response.body.interview.locationOrLink, 'https://meet.google.com/test-room')
  assert.equal(response.body.interview.notes, 'Prepare system design architecture')
  assert.ok(response.body.interview.id)
})

test('3. Authenticated user can retrieve their own interviews', async () => {
  const response = await request(app)
    .get('/api/interviews')
    .set('x-test-user-id', testUserAId)

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body.interviews))
  assert.equal(response.body.interviews.length, 1)
  assert.equal(response.body.interviews[0].applicationId, userAAppId)
  assert.equal(response.body.interviews[0].interviewer, 'Alice Engineer')
})

test('4. Scheduling an interview against another user application is rejected with 404', async () => {
  // User A attempts to schedule against User B's application
  const response = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserAId)
    .send({
      applicationId: userBAppId, // belongs to User B!
      scheduledAt: '2026-10-31T15:00:00.000Z',
      type: 'PHONE_SCREENING',
    })

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.match(response.body.message, /not found or access denied/i)
})

test('5. User cannot read another user interview', async () => {
  // User B creates an interview
  const createRes = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserBId)
    .send({
      applicationId: userBAppId,
      scheduledAt: '2026-11-01T11:00:00.000Z',
      type: 'VIDEO_INTERVIEW',
      interviewer: 'Bob Recruiter',
    })
  assert.equal(createRes.status, 201)
  const userBInterviewId = createRes.body.interview.id

  // User A attempts to GET User B's interview by ID
  const response = await request(app)
    .get(`/api/interviews/${userBInterviewId}`)
    .set('x-test-user-id', testUserAId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')

  // User A's list also never includes User B's interview
  const listRes = await request(app)
    .get('/api/interviews')
    .set('x-test-user-id', testUserAId)

  assert.equal(listRes.status, 200)
  const ids = listRes.body.interviews.map((i: { id: string }) => i.id)
  assert.ok(!ids.includes(userBInterviewId))
})

test('6. User cannot update another user interview', async () => {
  // Get User B's interview
  const userBInterviews = await prisma.interview.findMany({
    where: { applicationId: userBAppId },
  })
  assert.ok(userBInterviews.length > 0)
  const userBInterviewId = userBInterviews[0].id

  // User A attempts to update User B's interview
  const response = await request(app)
    .patch(`/api/interviews/${userBInterviewId}`)
    .set('x-test-user-id', testUserAId)
    .send({ notes: 'Hacked by User A' })

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')

  // Verify DB record unchanged
  const freshRecord = await prisma.interview.findUnique({
    where: { id: userBInterviewId },
  })
  assert.notEqual(freshRecord?.notes, 'Hacked by User A')
})

test('7. User cannot delete another user interview', async () => {
  const userBInterviews = await prisma.interview.findMany({
    where: { applicationId: userBAppId },
  })
  const userBInterviewId = userBInterviews[0].id

  // User A attempts to delete User B's interview
  const response = await request(app)
    .delete(`/api/interviews/${userBInterviewId}`)
    .set('x-test-user-id', testUserAId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')

  // Verify DB record still exists
  const exists = await prisma.interview.findUnique({
    where: { id: userBInterviewId },
  })
  assert.ok(exists)
})

test('8. Valid partial updates preserve omitted fields', async () => {
  // Get User A's interview
  const userAInterviews = await prisma.interview.findMany({
    where: { applicationId: userAAppId },
  })
  const userAInterviewId = userAInterviews[0].id

  // Update only interviewer name
  const response = await request(app)
    .patch(`/api/interviews/${userAInterviewId}`)
    .set('x-test-user-id', testUserAId)
    .send({ interviewer: 'Principal Engineer Dave' })

  assert.equal(response.status, 200)
  assert.equal(response.body.interview.interviewer, 'Principal Engineer Dave')
  // Verify omitted fields preserved
  assert.equal(response.body.interview.locationOrLink, 'https://meet.google.com/test-room')
  assert.equal(response.body.interview.notes, 'Prepare system design architecture')
  assert.equal(response.body.interview.type, 'TECHNICAL_INTERVIEW')
})

test('9. Invalid dates, unknown interview types, and empty application IDs are rejected with HTTP 400', async () => {
  // Missing applicationId
  const res1 = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserAId)
    .send({ scheduledAt: '2026-11-05T10:00:00.000Z' })
  assert.equal(res1.status, 400)
  assert.equal(res1.body.error, 'Validation Error')

  // Invalid date
  const res2 = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserAId)
    .send({ applicationId: userAAppId, scheduledAt: 'invalid-date-string' })
  assert.equal(res2.status, 400)
  assert.equal(res2.body.error, 'Validation Error')

  // Invalid interview type
  const res3 = await request(app)
    .post('/api/interviews')
    .set('x-test-user-id', testUserAId)
    .send({
      applicationId: userAAppId,
      scheduledAt: '2026-11-05T10:00:00.000Z',
      type: 'SUPER_UNKNOWN_ROUND',
    })
  assert.equal(res3.status, 400)
  assert.equal(res3.body.error, 'Validation Error')
})

test('10. Deleting an application deletes related interviews in DB via cascade', async () => {
  // Create a dedicated application and interview for testing cascade deletion
  const cascadeApp = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Cascade Corp',
      jobTitle: 'Reliability Engineer',
      status: 'INTERVIEW',
    },
  })

  await prisma.interview.create({
    data: {
      applicationId: cascadeApp.id,
      scheduledAt: new Date('2026-11-10T10:00:00.000Z'),
      type: 'TECHNICAL_INTERVIEW',
    },
  })

  // Verify interview exists
  const beforeCount = await prisma.interview.count({
    where: { applicationId: cascadeApp.id },
  })
  assert.equal(beforeCount, 1)

  // Delete application via DELETE /api/applications/:id
  const deleteRes = await request(app)
    .delete(`/api/applications/${cascadeApp.id}`)
    .set('x-test-user-id', testUserAId)

  assert.equal(deleteRes.status, 200)

  // Verify interview was cascade deleted in PostgreSQL
  const afterCount = await prisma.interview.count({
    where: { applicationId: cascadeApp.id },
  })
  assert.equal(afterCount, 0)
})
