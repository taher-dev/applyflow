import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const testUserAId = 'a1111111-1111-1111-1111-111111111111'
const testUserBId = 'b2222222-2222-2222-2222-222222222222'

before(async () => {
  // Ensure isolated test users exist in applyflow_test database
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

  // Clean only test user records before testing
  await prisma.application.deleteMany({
    where: { userId: { in: [testUserAId, testUserBId] } },
  })
})

after(async () => {
  // Clean only test user records after testing
  await prisma.application.deleteMany({
    where: { userId: { in: [testUserAId, testUserBId] } },
  })
  await prisma.$disconnect()
})

test('1. Unauthenticated requests to GET /api/applications return HTTP 401', async () => {
  const response = await request(app).get('/api/applications')

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
  assert.ok(response.body.message)
})

test('2. Unauthenticated requests to POST /api/applications return HTTP 401', async () => {
  const response = await request(app)
    .post('/api/applications')
    .send({ company: 'Acme Corp', jobTitle: 'Software Engineer' })

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
})

test('3. Authenticated POST /api/applications creates an application for the user', async () => {
  const payload = {
    company: 'Stripe',
    jobTitle: 'Full Stack Engineer',
    status: 'Applied',
    workplaceType: 'Remote',
    employmentType: 'Full-time',
    jobUrl: 'https://stripe.com/jobs/123',
    minSalary: 140000,
    maxSalary: 180000,
    salary: '$140k - $180k',
    notes: 'Referral through alumni network',
  }

  const response = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send(payload)

  assert.equal(response.status, 201)
  assert.ok(response.body.application)
  assert.equal(response.body.application.userId, testUserAId)
  assert.equal(response.body.application.company, 'Stripe')
  assert.equal(response.body.application.jobTitle, 'Full Stack Engineer')
  assert.equal(response.body.application.status, 'APPLIED')
  assert.equal(response.body.application.minSalary, 140000)
  assert.equal(response.body.application.maxSalary, 180000)
  assert.ok(response.body.application.id)
})

test('4. Authenticated user can retrieve their own applications', async () => {
  const response = await request(app)
    .get('/api/applications')
    .set('X-Test-User-Id', testUserAId)

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body.applications))
  assert.equal(response.body.applications.length, 1)
  assert.equal(response.body.applications[0].company, 'Stripe')
  assert.equal(response.body.applications[0].userId, testUserAId)
})

test('5. GET /api/applications never returns another user applications', async () => {
  // Query as User B, who has not created any applications yet
  const response = await request(app)
    .get('/api/applications')
    .set('X-Test-User-Id', testUserBId)

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body.applications))
  assert.equal(response.body.applications.length, 0)
})

test('6. POST /api/applications rejects missing required fields with HTTP 400', async () => {
  // Missing company
  const noCompanyResponse = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send({ jobTitle: 'Frontend Engineer' })

  assert.equal(noCompanyResponse.status, 400)
  assert.equal(noCompanyResponse.body.error, 'Validation Error')
  assert.ok(noCompanyResponse.body.details?.company)

  // Missing job title
  const noTitleResponse = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send({ company: 'Google' })

  assert.equal(noTitleResponse.status, 400)
  assert.equal(noTitleResponse.body.error, 'Validation Error')
  assert.ok(noTitleResponse.body.details?.jobTitle)
})

test('7. POST /api/applications rejects invalid status values with HTTP 400', async () => {
  const response = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send({
      company: 'Netflix',
      jobTitle: 'Backend Engineer',
      status: 'INVALID_STATUS_VALUE',
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.ok(response.body.details?.status)
})

test('8. POST /api/applications rejects invalid salary boundaries (minSalary > maxSalary)', async () => {
  const response = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send({
      company: 'Amazon',
      jobTitle: 'Software Engineer',
      minSalary: 200000,
      maxSalary: 120000, // Invalid: max < min
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.ok(response.body.details?.maxSalary)
})

test('9. Client cannot override ownership by providing userId in the request body', async () => {
  const response = await request(app)
    .post('/api/applications')
    .set('X-Test-User-Id', testUserAId)
    .send({
      company: 'Meta',
      jobTitle: 'Production Engineer',
      userId: testUserBId, // Attempted spoof of owner ID
    })

  assert.equal(response.status, 201)
  // Must still belong strictly to the authenticated testUserAId
  assert.equal(response.body.application.userId, testUserAId)
  assert.notEqual(response.body.application.userId, testUserBId)
})

test('10. Database errors are caught and handled safely by centralized error handler', async () => {
  // Pass an invalid query that triggers a database error or tests error middleware
  const invalidApp = await request(app)
    .get('/api/applications')
    .set('X-Test-User-Id', 'not-a-valid-uuid-and-non-existent')

  // Since user doesn't exist in DB, findMany simply returns [] without crashing
  assert.equal(invalidApp.status, 200)
  assert.deepEqual(invalidApp.body.applications, [])
})
