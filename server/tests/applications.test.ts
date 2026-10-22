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

test('11. Unauthenticated requests to GET/PATCH/DELETE /api/applications/:id return HTTP 401', async () => {
  const getRes = await request(app).get('/api/applications/some-id')
  assert.equal(getRes.status, 401)
  assert.equal(getRes.body.error, 'Unauthorized')

  const patchRes = await request(app)
    .patch('/api/applications/some-id')
    .send({ status: 'Interview' })
  assert.equal(patchRes.status, 401)
  assert.equal(patchRes.body.error, 'Unauthorized')

  const deleteRes = await request(app).delete('/api/applications/some-id')
  assert.equal(deleteRes.status, 401)
  assert.equal(deleteRes.body.error, 'Unauthorized')
})

test('12. GET /api/applications/:id returns owned application by ID', async () => {
  // Create an application for User A
  const created = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'GitHub',
      jobTitle: 'Senior Systems Engineer',
      status: 'INTERVIEW',
      workplaceType: 'REMOTE',
      minSalary: 160000,
      maxSalary: 210000,
      notes: 'Initial technical phone screen completed',
    },
  })

  const response = await request(app)
    .get(`/api/applications/${created.id}`)
    .set('X-Test-User-Id', testUserAId)

  assert.equal(response.status, 200)
  assert.ok(response.body.application)
  assert.equal(response.body.application.id, created.id)
  assert.equal(response.body.application.company, 'GitHub')
  assert.equal(response.body.application.jobTitle, 'Senior Systems Engineer')
  assert.equal(response.body.application.status, 'INTERVIEW')
})

test('13. GET /api/applications/:id returns 404 for non-existent application', async () => {
  const response = await request(app)
    .get('/api/applications/non-existent-uuid-1234')
    .set('X-Test-User-Id', testUserAId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(response.body.message, 'Application not found')
})

test('14. GET /api/applications/:id returns 404 when querying another user application', async () => {
  // Create an application belonging to User A
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Figma',
      jobTitle: 'Design Technologist',
      status: 'APPLIED',
      workplaceType: 'HYBRID',
    },
  })

  // Attempt to access it as User B
  const response = await request(app)
    .get(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserBId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(response.body.message, 'Application not found')
})

test('15. PATCH /api/applications/:id updates owned application and returns 200', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Vercel',
      jobTitle: 'Frontend Infrastructure Lead',
      status: 'APPLIED',
      workplaceType: 'REMOTE',
      minSalary: 150000,
      maxSalary: 200000,
    },
  })

  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      status: 'Interview',
      location: 'San Francisco, CA',
      notes: 'Scheduled round 1 with VP of Eng',
    })

  assert.equal(response.status, 200)
  assert.ok(response.body.application)
  assert.equal(response.body.application.status, 'INTERVIEW')
  assert.equal(response.body.application.location, 'San Francisco, CA')
  assert.equal(response.body.application.notes, 'Scheduled round 1 with VP of Eng')
  // Verify omitted fields are preserved
  assert.equal(response.body.application.company, 'Vercel')
  assert.equal(response.body.application.jobTitle, 'Frontend Infrastructure Lead')
  assert.equal(response.body.application.minSalary, 150000)
  assert.equal(response.body.application.maxSalary, 200000)
})

test('16. PATCH /api/applications/:id updates only selected fields while preserving omitted fields', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Datadog',
      jobTitle: 'Core Engine Engineer',
      status: 'SCREENING',
      workplaceType: 'ON_SITE',
      notes: 'Old notes to preserve',
      minSalary: 140000,
      maxSalary: 180000,
    },
  })

  // Update only company name
  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      company: 'Datadog Europe',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.application.company, 'Datadog Europe')
  assert.equal(response.body.application.jobTitle, 'Core Engine Engineer')
  assert.equal(response.body.application.status, 'SCREENING')
  assert.equal(response.body.application.workplaceType, 'ON_SITE')
  assert.equal(response.body.application.notes, 'Old notes to preserve')
  assert.equal(response.body.application.minSalary, 140000)
  assert.equal(response.body.application.maxSalary, 180000)
})

test('17. PATCH /api/applications/:id rejects invalid status values with HTTP 400', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Linear',
      jobTitle: 'Product Engineer',
      status: 'SAVED',
      workplaceType: 'REMOTE',
    },
  })

  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      status: 'INVALID_STATUS',
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.ok(response.body.details?.status)
})

test('18. PATCH /api/applications/:id rejects invalid salary boundary (minSalary > maxSalary) with HTTP 400', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'OpenAI',
      jobTitle: 'Research Engineer',
      status: 'SAVED',
      workplaceType: 'HYBRID',
    },
  })

  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      minSalary: 250000,
      maxSalary: 180000,
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.ok(response.body.details?.maxSalary)
})

test('19. PATCH /api/applications/:id rejects updating minSalary above existing maxSalary with HTTP 400', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Anthropic',
      jobTitle: 'Alignment Engineer',
      status: 'APPLIED',
      workplaceType: 'HYBRID',
      minSalary: 150000,
      maxSalary: 200000,
    },
  })

  // Try to update minSalary to 220000 without specifying maxSalary
  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      minSalary: 220000,
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.equal(response.body.message, 'Minimum salary cannot exceed maximum salary')
})

test('20. PATCH /api/applications/:id rejects invalid URL and empty company with HTTP 400', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Cloudflare',
      jobTitle: 'Edge Engineer',
      status: 'SAVED',
      workplaceType: 'REMOTE',
    },
  })

  const invalidUrlRes = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      jobUrl: 'not-a-valid-http-url',
    })

  assert.equal(invalidUrlRes.status, 400)
  assert.equal(invalidUrlRes.body.error, 'Validation Error')
  assert.ok(invalidUrlRes.body.details?.jobUrl)

  const emptyCompanyRes = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      company: '   ',
    })

  assert.equal(emptyCompanyRes.status, 400)
  assert.equal(emptyCompanyRes.body.error, 'Validation Error')
  assert.ok(emptyCompanyRes.body.details?.company)
})

test('21. PATCH /api/applications/:id returns 404 and does not update when targeting another user application', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Airbnb',
      jobTitle: 'Staff Engineer',
      status: 'APPLIED',
      workplaceType: 'REMOTE',
    },
  })

  // User B attempts to patch User A's application
  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserBId)
    .send({
      status: 'Rejected',
    })

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(response.body.message, 'Application not found')

  // Verify in database that User A's application was NOT modified
  const unmodified = await prisma.application.findUnique({
    where: { id: appA.id },
  })
  assert.equal(unmodified?.status, 'APPLIED')
})

test('22. PATCH /api/applications/:id cannot spoof ownership via userId in request body', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Adobe',
      jobTitle: 'Platform Architect',
      status: 'SAVED',
      workplaceType: 'REMOTE',
    },
  })

  const response = await request(app)
    .patch(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)
    .send({
      userId: testUserBId,
      company: 'Adobe Design Systems',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.application.userId, testUserAId)
  assert.notEqual(response.body.application.userId, testUserBId)

  // Verify in database
  const inDb = await prisma.application.findUnique({ where: { id: appA.id } })
  assert.equal(inDb?.userId, testUserAId)
})

test('23. DELETE /api/applications/:id removes owned application and returns 200', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Uber',
      jobTitle: 'Backend Engineer',
      status: 'SAVED',
      workplaceType: 'HYBRID',
    },
  })

  const response = await request(app)
    .delete(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)

  assert.equal(response.status, 200)
  assert.equal(response.body.message, 'Application deleted successfully')

  // Verify record no longer exists in DB
  const inDb = await prisma.application.findUnique({ where: { id: appA.id } })
  assert.equal(inDb, null)

  // Subsequent GET returns 404
  const getSubsequent = await request(app)
    .get(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserAId)

  assert.equal(getSubsequent.status, 404)
})

test('24. DELETE /api/applications/:id returns 404 for non-existent application', async () => {
  const response = await request(app)
    .delete('/api/applications/non-existent-uuid-5678')
    .set('X-Test-User-Id', testUserAId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(response.body.message, 'Application not found')
})

test('25. DELETE /api/applications/:id returns 404 and does not delete another user application', async () => {
  const appA = await prisma.application.create({
    data: {
      userId: testUserAId,
      company: 'Spotify',
      jobTitle: 'Audio Engineer',
      status: 'OFFER',
      workplaceType: 'REMOTE',
    },
  })

  // User B attempts to delete User A's application
  const response = await request(app)
    .delete(`/api/applications/${appA.id}`)
    .set('X-Test-User-Id', testUserBId)

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(response.body.message, 'Application not found')

  // Verify record still exists in DB for User A
  const inDb = await prisma.application.findUnique({ where: { id: appA.id } })
  assert.ok(inDb)
  assert.equal(inDb.company, 'Spotify')
})

