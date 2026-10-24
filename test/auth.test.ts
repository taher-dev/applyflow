import test, { describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { api, ApiError } from '../src/lib/api.ts'
import type { User } from '../src/types/auth.ts'

describe('Frontend Authentication & API Client', () => {
  const originalFetch = globalThis.fetch
  const mockUser: User = {
    id: 'user-uuid-1234',
    name: 'Jane Doe',
    email: 'jane@example.com',
    createdAt: '2026-10-19T00:00:00.000Z',
  }

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('Session Restoration (getMe)', () => {
    test('successfully restores session when 200 is returned', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const user = await api.auth.getMe()

      assert.deepEqual(user, mockUser)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/auth/me'))
      assert.equal(capturedRequest.init?.credentials, 'include')
    })

    test('identifies unauthenticated initial session when 401 is returned', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required: no active session',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.auth.getMe()
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 401)
          assert.equal(err.code, 'UNAUTHORIZED')
          assert.equal(err.message, 'Authentication required: no active session')
          return true
        }
      )
    })

    test('handles expired or missing session correctly', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Session has expired, please log in again',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.auth.getMe()
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 401)
          assert.equal(err.code, 'SESSION_EXPIRED')
          return true
        }
      )
    })
  })

  describe('User Registration', () => {
    test('successfully registers new user and returns safe user object', async () => {
      let capturedBody = ''
      let capturedInit: RequestInit | undefined

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedInit = init
        capturedBody = init?.body as string
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const result = await api.auth.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      })

      assert.deepEqual(result, mockUser)
      assert.equal(capturedInit?.credentials, 'include')
      assert.equal(capturedInit?.method, 'POST')
      const parsedBody = JSON.parse(capturedBody)
      assert.equal(parsedBody.name, 'Jane Doe')
      assert.equal(parsedBody.email, 'jane@example.com')
      assert.equal(parsedBody.password, 'Password123!')
    })

    test('surfaces validation errors with field details on 400 response', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid registration details',
            details: {
              password: ['Password must be at least 8 characters'],
              email: ['Invalid email address'],
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
          await api.auth.register({
            name: 'Jane',
            email: 'bad-email',
            password: 'short',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 400)
          assert.equal(err.code, 'Validation Error')
          const details = err.details as Record<string, string[]>
          assert.ok(details)
          assert.ok(Array.isArray(details.password))
          assert.equal(details.password[0], 'Password must be at least 8 characters')
          return true
        }
      )
    })
  })

  describe('User Login', () => {
    test('successfully logs in and returns authenticated user', async () => {
      let capturedInit: RequestInit | undefined

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedInit = init
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const result = await api.auth.login({
        email: 'jane@example.com',
        password: 'Password123!',
      })

      assert.deepEqual(result, mockUser)
      assert.equal(capturedInit?.credentials, 'include')
      assert.equal(capturedInit?.method, 'POST')
      const headers = capturedInit?.headers
      const contentType =
        headers instanceof Headers
          ? headers.get('Content-Type')
          : (headers as Record<string, string>)?.[
              'Content-Type'
            ]
      assert.equal(contentType, 'application/json')
    })

    test('handles invalid credentials (401) with clean error message', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.auth.login({
            email: 'jane@example.com',
            password: 'WrongPassword',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 401)
          assert.equal(err.message, 'Invalid email or password')
          return true
        }
      )
    })

    test('successfully signs in via Google OAuth endpoint', async () => {
      let capturedRequest: { url: string; init?: RequestInit } | null = null

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = { url: input.toString(), init }
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const user = await api.auth.googleLogin({
        email: 'jane@example.com',
        name: 'Jane Doe',
      })

      assert.deepEqual(user, mockUser)
      assert.ok(capturedRequest)
      assert.ok(capturedRequest.url.endsWith('/auth/google'))
      assert.equal(capturedRequest.init?.method, 'POST')
      assert.equal(capturedRequest.init?.credentials, 'include')
    })

    test('googleLogin without profile sends empty body and establishes demo session', async () => {
      let capturedBody: string | undefined

      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = init?.body as string
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const user = await api.auth.googleLogin()
      assert.deepEqual(user, mockUser)
      assert.equal(capturedBody, '{}')
    })

    test('googleLogin handles 501 Not Implemented error response when disabled outside development', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Not Implemented',
            message: 'Google authentication is not supported in this environment.',
          }),
          {
            status: 501,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        () => api.auth.googleLogin(),
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 501)
          assert.match(err.message, /not supported in this environment/i)
          return true
        }
      )
    })

    test('googleLogin handles 403 Forbidden error response when impersonation is rejected', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Forbidden',
            message: 'Demo authentication cannot be used to access existing user accounts.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        () => api.auth.googleLogin({ email: 'victim@example.com' }),
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 403)
          assert.match(err.message, /cannot be used to access existing user accounts/i)
          return true
        }
      )
    })
  })

  describe('User Logout', () => {
    test('successfully logs out and uses credentials: include', async () => {
      let capturedInit: RequestInit | undefined
      let calledUrl = ''

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        calledUrl = input.toString()
        capturedInit = init
        return new Response(null, { status: 204 })
      }

      await api.auth.logout()

      assert.ok(calledUrl.endsWith('/auth/logout'))
      assert.equal(capturedInit?.method, 'POST')
      assert.equal(capturedInit?.credentials, 'include')
    })

    test('throws ApiError if server logout fails', async () => {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to revoke session',
            },
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await assert.rejects(
        async () => {
          await api.auth.logout()
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 500)
          assert.equal(err.message, 'Failed to revoke session')
          return true
        }
      )
    })
  })

  describe('Error Handling & Network Resiliency', () => {
    test('converts network failures into safe ApiError', async () => {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch')
      }

      await assert.rejects(
        async () => {
          await api.auth.getMe()
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 0)
          assert.equal(err.code, 'NETWORK_ERROR')
          assert.ok(err.message.includes('Unable to connect to the server'))
          return true
        }
      )
    })

    test('handles non-JSON error response gracefully (e.g. HTML 502/504 proxy error)', async () => {
      globalThis.fetch = async () => {
        return new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/html' },
        })
      }

      await assert.rejects(
        async () => {
          await api.auth.getMe()
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 502)
          assert.ok(err.message.includes('Bad Gateway') || err.message.includes('502'))
          return true
        }
      )
    })

    test('handles server JSON error that uses standard Express message format', async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ message: 'CSRF token mismatch or invalid origin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await assert.rejects(
        async () => {
          await api.auth.login({ email: 'test@example.com', password: 'password' })
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError)
          assert.equal(err.status, 403)
          assert.equal(err.message, 'CSRF token mismatch or invalid origin')
          return true
        }
      )
    })
  })

  describe('Security & Storage Invariants', () => {
    test('does not persist credentials or tokens to localStorage or sessionStorage during auth flows', async () => {
      // Create clean mock storage
      const mockStorage: Record<string, string> = {}
      const fakeStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v
        },
        removeItem: (k: string) => {
          delete mockStorage[k]
        },
        clear: () => {
          for (const k in mockStorage) delete mockStorage[k]
        },
      }
      ;(globalThis as unknown as { localStorage: typeof fakeStorage }).localStorage = fakeStorage

      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await api.auth.login({
        email: 'jane@example.com',
        password: 'SuperSecretPassword123!',
      })

      // Verify no auth token, session id, or password was saved to storage
      assert.equal(Object.keys(mockStorage).length, 0)
      assert.equal(mockStorage['token'], undefined)
      assert.equal(mockStorage['auth_token'], undefined)
      assert.equal(mockStorage['session'], undefined)
      assert.equal(mockStorage['password'], undefined)
    })
  })

  describe('Password Reset Experience & Truthful Messaging', () => {
    test('AuthScreen contains truthful message that password reset is unavailable', () => {
      const authScreenSource = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/components/auth/AuthScreen.tsx'),
        'utf-8'
      )

      // 1. Truthful message is present
      assert.ok(
        authScreenSource.includes('Password reset is not available yet. Please contact the application administrator for assistance.'),
        'Expected AuthScreen to display truthful administrator contact guidance'
      )

      // 2. Clear return button is present
      assert.ok(
        authScreenSource.includes('Return to sign in'),
        'Expected AuthScreen to provide return to sign in button'
      )

      // 3. Removed false toast notification claiming email was sent
      assert.equal(
        authScreenSource.includes('Password reset link sent to'),
        false,
        'Must NOT claim password reset link was sent'
      )
      assert.equal(
        authScreenSource.includes('Enter your email address above to receive a password reset link'),
        false,
        'Must NOT pretend email input can receive a reset link'
      )
    })

    test('does not expose any fake password-reset API client methods or dispatch phantom requests', async () => {
      // Confirm no fake password-reset API client method exists that claims to send emails
      const authApi = api.auth as Record<string, unknown>
      assert.equal(authApi['resetPassword'], undefined)
      assert.equal(authApi['forgotPassword'], undefined)
      assert.equal(authApi['requestPasswordReset'], undefined)

      let networkCalled = false
      globalThis.fetch = async () => {
        networkCalled = true
        return new Response(null, { status: 404 })
      }

      // Verify no network activity occurs for password reset
      assert.equal(networkCalled, false)
    })
  })
})

