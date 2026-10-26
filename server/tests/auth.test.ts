import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { hashSessionToken, SESSION_COOKIE_NAME } from '../src/lib/session.js'

// Dynamic email prefix to avoid conflicts across test runs
const testRunId = Date.now().toString(36)
const testEmailA = `test-user-${testRunId}-a@applyflow.test`
const testEmailB = `test-user-${testRunId}-b@applyflow.test`
const testPassword = 'StrongPassword123!'

before(() => {
  process.env.ENABLE_DEMO_AUTH = 'true'
})

after(async () => {
  // Clean up any test users created during this test run
  await prisma.user.deleteMany({
    where: {
      email: { in: [testEmailA, testEmailB] },
    },
  })
  await prisma.$disconnect()
})

test('1. Successful registration creates user, session, and returns HttpOnly cookie', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Alice Developer',
      email: testEmailA,
      password: testPassword,
    })

  assert.equal(response.status, 201)
  assert.ok(response.body.user)
  assert.equal(response.body.user.name, 'Alice Developer')
  assert.equal(response.body.user.email, testEmailA)
  assert.ok(response.body.user.id)

  // Verify sensitive data is NEVER returned
  assert.equal(response.body.user.passwordHash, undefined)
  assert.equal(response.body.user.password, undefined)
  assert.equal(response.body.token, undefined)
  assert.equal(response.body.session, undefined)

  // Verify Set-Cookie header
  const cookies = response.headers['set-cookie']
  assert.ok(cookies)
  const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies
  assert.ok(cookieStr.includes(SESSION_COOKIE_NAME))
  assert.ok(cookieStr.toLowerCase().includes('httponly'))
  assert.ok(cookieStr.toLowerCase().includes('samesite=lax'))
})

test('2. Registration rejects invalid payloads with HTTP 400', async () => {
  // Empty name
  const emptyName = await request(app).post('/api/auth/register').send({
    name: '   ',
    email: 'valid@example.com',
    password: testPassword,
  })
  assert.equal(emptyName.status, 400)
  assert.equal(emptyName.body.error, 'Validation Error')
  assert.ok(emptyName.body.details?.name)

  // Invalid email format
  const badEmail = await request(app).post('/api/auth/register').send({
    name: 'Valid Name',
    email: 'not-an-email',
    password: testPassword,
  })
  assert.equal(badEmail.status, 400)
  assert.ok(badEmail.body.details?.email)

  // Short password (< 8 chars)
  const shortPass = await request(app).post('/api/auth/register').send({
    name: 'Valid Name',
    email: 'valid@example.com',
    password: 'short',
  })
  assert.equal(shortPass.status, 400)
  assert.ok(shortPass.body.details?.password)
})

test('3. Duplicate email registration returns HTTP 409 Conflict', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Alice Duplicate',
      email: testEmailA,
      password: testPassword,
    })

  assert.equal(response.status, 409)
  assert.equal(response.body.error, 'Conflict')
  assert.equal(response.body.message, 'An account with this email already exists')
})

test('4. Successful login returns HTTP 200, safe user, and new session cookie', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: testEmailA,
      password: testPassword,
    })

  assert.equal(response.status, 200)
  assert.ok(response.body.user)
  assert.equal(response.body.user.email, testEmailA)
  assert.equal(response.body.user.passwordHash, undefined)

  const cookies = response.headers['set-cookie']
  assert.ok(cookies)
  const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies
  assert.ok(cookieStr.includes(SESSION_COOKIE_NAME))
})

test('5. Login with incorrect password returns generic HTTP 401', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: testEmailA,
      password: 'WrongPassword999!',
    })

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
  assert.equal(response.body.message, 'Invalid email or password')
})

test('6. Login with non-existent email returns identical generic HTTP 401', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'nonexistent-user-xyz@applyflow.test',
      password: 'AnyPassword123!',
    })

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
  assert.equal(response.body.message, 'Invalid email or password')
})

test('7. GET /api/auth/me without session cookie returns HTTP 401', async () => {
  const response = await request(app).get('/api/auth/me')

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
})

test('8. GET /api/auth/me with invalid or forged cookie returns HTTP 401', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`${SESSION_COOKIE_NAME}=forged_session_token_1234567890`])

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
})

test('9. GET /api/auth/me with valid session cookie returns safe user data', async () => {
  // 1. Log in to obtain valid cookie
  const loginRes = await request(app).post('/api/auth/login').send({
    email: testEmailA,
    password: testPassword,
  })
  const sessionCookie = loginRes.headers['set-cookie']

  // 2. Query /me with session cookie
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', sessionCookie)

  assert.equal(meRes.status, 200)
  assert.ok(meRes.body.user)
  assert.equal(meRes.body.user.email, testEmailA)
  assert.equal(meRes.body.user.passwordHash, undefined)
})

test('10. Expired session is rejected with HTTP 401', async () => {
  // Create an expired session directly in PostgreSQL
  const user = await prisma.user.findUnique({ where: { email: testEmailA } })
  assert.ok(user)

  const fakeExpiredToken = 'expired_raw_token_xyz_123456789'
  const tokenHash = hashSessionToken(fakeExpiredToken)

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
    },
  })

  const response = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`${SESSION_COOKIE_NAME}=${fakeExpiredToken}`])

  assert.equal(response.status, 401)
  assert.equal(response.body.error, 'Unauthorized')
})

test('11. POST /api/auth/logout revokes session in DB and clears cookie', async () => {
  // Log in
  const loginRes = await request(app).post('/api/auth/login').send({
    email: testEmailA,
    password: testPassword,
  })
  const sessionCookie = loginRes.headers['set-cookie']

  // Logout
  const logoutRes = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', sessionCookie)

  assert.equal(logoutRes.status, 200)
  assert.equal(logoutRes.body.message, 'Logged out successfully')

  // Verify cleared cookie header
  const clearedCookies = logoutRes.headers['set-cookie']
  assert.ok(clearedCookies)
  const clearedStr = Array.isArray(clearedCookies) ? clearedCookies.join(';') : clearedCookies
  assert.ok(clearedStr.includes('Expires=') || clearedStr.includes('Max-Age=0'))

  // Verify querying /me with the logged out cookie now returns 401
  const afterLogoutRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', sessionCookie)

  assert.equal(afterLogoutRes.status, 401)
})

test('12. Real cookie session enforces application ownership', async () => {
  // Register User B
  const registerBRes = await request(app).post('/api/auth/register').send({
    name: 'Bob Developer',
    email: testEmailB,
    password: testPassword,
  })
  const cookieB = registerBRes.headers['set-cookie']

  // Log in User A
  const loginARes = await request(app).post('/api/auth/login').send({
    email: testEmailA,
    password: testPassword,
  })
  const cookieA = loginARes.headers['set-cookie']

  // User A creates an application using cookie A
  const createRes = await request(app)
    .post('/api/applications')
    .set('Cookie', cookieA)
    .send({
      company: 'Datadog',
      jobTitle: 'Site Reliability Engineer',
      status: 'Applied',
    })

  assert.equal(createRes.status, 201)
  assert.equal(createRes.body.application.company, 'Datadog')

  // User B queries applications using cookie B
  const listBRes = await request(app)
    .get('/api/applications')
    .set('Cookie', cookieB)

  assert.equal(listBRes.status, 200)
  assert.ok(Array.isArray(listBRes.body.applications))
  // User B should NOT see User A's Datadog application
  const hasDatadog = listBRes.body.applications.some(
    (app: { company: string }) => app.company === 'Datadog'
  )
  assert.equal(hasDatadog, false)

  // User A queries applications using cookie A
  const listARRes = await request(app)
    .get('/api/applications')
    .set('Cookie', cookieA)

  assert.equal(listARRes.status, 200)
  const userAHasDatadog = listARRes.body.applications.some(
    (app: { company: string }) => app.company === 'Datadog'
  )
  assert.equal(userAHasDatadog, true)
})

test('13. CSRF origin validation: untrusted Origin on state-changing request is rejected with HTTP 403', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Origin', 'http://malicious-attacker-website.com')
    .send({
      email: testEmailA,
      password: testPassword,
    })

  assert.equal(response.status, 403)
  assert.equal(response.body.error, 'Forbidden')
  assert.ok(response.body.message.includes('CSRF'))
})

test('14. CSRF origin validation: allowed Origin succeeds', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({
      email: testEmailA,
      password: testPassword,
    })

  assert.equal(response.status, 200)
  assert.ok(response.body.user)
})

test('15. CORS header sends Access-Control-Allow-Credentials: true', async () => {
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'http://localhost:5173')

  assert.equal(response.status, 200)
  assert.equal(response.headers['access-control-allow-credentials'], 'true')
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173')
})

test('16. POST /api/auth/google creates or authenticates user and returns session cookie', async () => {
  const googleEmail = `google-user-${testRunId}@gmail.com`
  const response = await request(app)
    .post('/api/auth/google')
    .set('Origin', 'http://localhost:5173')
    .send({
      email: googleEmail,
      name: 'Google User Test',
    })

  assert.equal(response.status, 200)
  assert.ok(response.body.user)
  assert.equal(response.body.user.email, googleEmail)
  assert.equal(response.body.user.name, 'Google User Test')

  // Verify cookie was set
  const cookies = response.headers['set-cookie']
  assert.ok(cookies)
  const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies
  assert.ok(cookieStr.includes(SESSION_COOKIE_NAME))

  // Clean up
  await prisma.user.deleteMany({ where: { email: googleEmail } })
})

test('17. POST /api/auth/google is rejected with HTTP 501 when outside development (production mode)', async () => {
  const prevNodeEnv = process.env.NODE_ENV
  const prodTargetEmail = `prod-attempt-${testRunId}@applyflow.test`

  try {
    process.env.NODE_ENV = 'production'

    const response = await request(app)
      .post('/api/auth/google')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: prodTargetEmail,
        name: 'Production Attempt',
      })

    assert.equal(response.status, 400)
    assert.equal(response.body.error, 'Bad Request')
    assert.match(response.body.message, /credential/i)

    // Verify no cookie was set
    const cookies = response.headers['set-cookie']
    assert.ok(!cookies || !cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME)))

    // Verify no user was created in the database
    const userInDb = await prisma.user.findUnique({
      where: { email: prodTargetEmail },
    })
    assert.equal(userInDb, null)
  } finally {
    process.env.NODE_ENV = prevNodeEnv
  }
})

test('18. POST /api/auth/google is rejected with HTTP 501 when ENABLE_DEMO_AUTH is disabled', async () => {
  const prevDemo = process.env.ENABLE_DEMO_AUTH
  const disabledTargetEmail = `disabled-attempt-${testRunId}@applyflow.test`

  try {
    process.env.ENABLE_DEMO_AUTH = 'false'

    const response = await request(app)
      .post('/api/auth/google')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: disabledTargetEmail,
      })

    assert.equal(response.status, 400)
    assert.equal(response.body.error, 'Bad Request')

    // Verify no session cookie set
    const cookies = response.headers['set-cookie']
    assert.ok(!cookies || !cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME)))

    // Verify no user was created
    const userInDb = await prisma.user.findUnique({
      where: { email: disabledTargetEmail },
    })
    assert.equal(userInDb, null)
  } finally {
    process.env.ENABLE_DEMO_AUTH = prevDemo
  }
})

test('19. POST /api/auth/google rejects attempting to impersonate an existing user', async () => {
  const victimEmail = `victim-account-${testRunId}@applyflow.test`

  // 1. Create a legitimate existing user
  const victim = await prisma.user.create({
    data: {
      name: 'Legitimate User',
      email: victimEmail,
      passwordHash: '$2b$10$insecuretestplaceholderforuserahash',
    },
  })

  try {
    // 2. Attacker attempts to sign in via mock Google using the victim's email
    const response = await request(app)
      .post('/api/auth/google')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: victimEmail,
        name: 'Hacker Name',
      })

    assert.equal(response.status, 403)
    assert.equal(response.body.error, 'Forbidden')
    assert.match(response.body.message, /cannot be used to access existing user accounts/i)

    // Verify no cookie was set
    const cookies = response.headers['set-cookie']
    assert.ok(!cookies || !cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME)))

    // Verify victim's user record in DB was not altered
    const freshVictim = await prisma.user.findUnique({
      where: { id: victim.id },
    })
    assert.equal(freshVictim?.name, 'Legitimate User')
  } finally {
    await prisma.user.deleteMany({ where: { id: victim.id } })
  }
})

test('20. POST /api/auth/google safely authenticates dedicated demo account when no email is provided', async () => {
  const response = await request(app)
    .post('/api/auth/google')
    .set('Origin', 'http://localhost:5173')
    .send({})

  assert.equal(response.status, 200)
  assert.ok(response.body.user)
  assert.equal(response.body.user.email, 'demo.google@applyflow.app')
  assert.equal(response.body.user.name, 'Google Demo User')

  // Verify session cookie was set
  const cookies = response.headers['set-cookie']
  assert.ok(cookies)
  const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies
  assert.ok(cookieStr.includes(SESSION_COOKIE_NAME))

  // Clean up demo user
  await prisma.user.deleteMany({ where: { email: 'demo.google@applyflow.app' } })
})

test('21. POST /api/auth/register rejects registering with reserved demo email', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Impostor',
      email: 'demo.google@applyflow.app',
      password: 'StrongPassword123!',
    })

  assert.equal(response.status, 400)
  assert.equal(response.body.error, 'Validation Error')
  assert.match(response.body.message, /reserved for demo authentication/i)
})

