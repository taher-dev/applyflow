import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import handler, { app } from '../api/index.ts'

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

  test('GET /api with x-matched-path: /api/health (simulating Vercel destination rewrite) restores target path', async () => {
    const res = await fetch(`${baseUrl}/api`, {
      headers: {
        'x-matched-path': '/api/health',
      },
    })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok' })
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
