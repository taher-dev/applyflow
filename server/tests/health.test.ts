import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import { app } from '../src/app.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

test('GET /api/health returns 200 and status ok', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.equal(response.headers['content-type']?.includes('application/json'), true)
  assert.deepEqual(response.body, {
    status: 'ok',
  })
})

test('GET unknown route returns 404 Not Found JSON response', async () => {
  const response = await request(app).get('/api/non-existent-endpoint')

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'Not Found')
  assert.equal(
    response.body.message,
    'Cannot GET /api/non-existent-endpoint'
  )
})

test('errorHandler catches unhandled route errors and returns safe JSON', async () => {
  const testApp = express()
  testApp.get('/api/error-test', () => {
    throw new Error('Simulated internal server failure')
  })
  testApp.use(errorHandler)

  const response = await request(testApp).get('/api/error-test')

  assert.equal(response.status, 500)
  assert.equal(response.body.error, 'Internal Server Error')
  assert.ok(response.body.message)
})
