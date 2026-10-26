import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import handler from '../api/index.ts'

interface SearchResponseData {
  success?: boolean
  provider: string
  providerName: string
  providerAvailable: boolean
  jobs: unknown[]
  fallbackSearchUrl: string
  error?: string
}

interface ValidationErrorData {
  error: string
  details: Record<string, string[]>
}

interface ProvidersResponseData {
  providers: { id: string; name: string }[]
}

describe('Job Discovery API Endpoints', () => {
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

  test('1. GET /api/jobs/search is publicly accessible without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/search?q=Developer&pageSize=2`)
    assert.equal(res.status, 200)

    const data = (await res.json()) as SearchResponseData
    assert.equal(data.provider, 'bdjobs')
    assert.equal(data.providerName, 'BDJobs')
    assert.ok(typeof data.providerAvailable === 'boolean')
    assert.ok(Array.isArray(data.jobs))
    assert.ok(typeof data.fallbackSearchUrl === 'string')
  })

  test('2. GET /api/jobs/search validates pagination parameters and rejects invalid values with HTTP 400', async () => {
    // Page must be at least 1
    const resNegativePage = await fetch(`${baseUrl}/api/jobs/search?page=0`)
    assert.equal(resNegativePage.status, 400)
    const errPage = (await resNegativePage.json()) as ValidationErrorData
    assert.equal(errPage.error, 'Validation Error')
    assert.ok(errPage.details.page)

    // PageSize must not exceed 30
    const resExcessivePageSize = await fetch(`${baseUrl}/api/jobs/search?pageSize=100`)
    assert.equal(resExcessivePageSize.status, 400)
    const errPageSize = (await resExcessivePageSize.json()) as ValidationErrorData
    assert.equal(errPageSize.error, 'Validation Error')
    assert.ok(errPageSize.details.pageSize)

    // Keyword too long (> 100 chars)
    const longKeyword = 'a'.repeat(105)
    const resLongKeyword = await fetch(`${baseUrl}/api/jobs/search?q=${longKeyword}`)
    assert.equal(resLongKeyword.status, 400)
    const errKeyword = (await resLongKeyword.json()) as ValidationErrorData
    assert.equal(errKeyword.error, 'Validation Error')
    assert.ok(errKeyword.details.q)
  })

  test('3. GET /api/jobs/search handles unknown providers with truthful fallback metadata', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/search?provider=invalid_provider&q=Engineer`)
    assert.equal(res.status, 200)

    const data = (await res.json()) as SearchResponseData
    assert.equal(data.success, false)
    assert.equal(data.providerAvailable, false)
    assert.ok(data.error?.includes('Unsupported job provider'))
    assert.equal(data.jobs.length, 0)
    assert.ok(data.fallbackSearchUrl.includes('bdjobs.com'))
  })

  test('4. GET /api/jobs/providers lists available job providers', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/providers`)
    assert.equal(res.status, 200)

    const data = (await res.json()) as ProvidersResponseData
    assert.ok(Array.isArray(data.providers))
    const bdjobs = data.providers.find((p: { id: string }) => p.id === 'bdjobs')
    assert.ok(bdjobs, 'BDJobs must be present in registered providers')
    assert.equal(bdjobs.name, 'BDJobs')
  })

  test('5. GET /api/jobs/details rejects requests without jobId with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/details`)
    assert.equal(res.status, 400)
    const data = (await res.json()) as { error: string; message: string }
    assert.equal(data.error, 'Validation Error')
  })

  test('6. GET /api/jobs/details returns 404 for unknown or invalid job ID', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/details?jobId=nonexistent_job_9999999`)
    assert.equal(res.status, 404)
    const data = (await res.json()) as { error: string; message: string }
    assert.equal(data.error, 'Not Found')
  })

  test('7. GET /api/jobs/:provider/:jobId path routing returns 404 for unknown job ID', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/bdjobs/nonexistent_job_8888888`)
    assert.equal(res.status, 404)
    const data = (await res.json()) as { error: string; message: string }
    assert.equal(data.error, 'Not Found')
  })
})
