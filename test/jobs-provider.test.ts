import test from 'node:test'
import assert from 'node:assert/strict'
import { BDJobsProvider, isValidBDJobsUrl } from '../server/dist/services/jobs/bdjobsProvider.js'
import { jobService } from '../server/dist/services/jobs/jobService.js'
import type { JobProvider, JobSearchParams, JobSearchResponse } from '../server/src/services/jobs/types.ts'

test('1. isValidBDJobsUrl validates hostnames correctly against allowed whitelist', () => {
  // Allowed hostnames
  assert.equal(isValidBDJobsUrl('https://bdjobs.com/h/details/12345'), true)
  assert.equal(isValidBDJobsUrl('https://jobs.bdjobs.com/details/12345'), true)
  assert.equal(isValidBDJobsUrl('https://www.bdjobs.com/h/jobs'), true)
  assert.equal(isValidBDJobsUrl('https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch'), true)

  // Disallowed / Arbitrary URLs
  assert.equal(isValidBDJobsUrl('https://evil.com/phishing'), false)
  assert.equal(isValidBDJobsUrl('https://bdjobs.com.evil.com/h/details'), false)
  assert.equal(isValidBDJobsUrl('https://google.com/search?q=bdjobs'), false)
  assert.equal(isValidBDJobsUrl('not-a-valid-url'), false)
  assert.equal(isValidBDJobsUrl(''), false)
})

test('2. BDJobsProvider generates fallback search URL with encoded query', () => {
  const provider = new BDJobsProvider()
  assert.equal(provider.getFallbackSearchUrl('React Developer'), 'https://bdjobs.com/h/jobs?keyword=React%20Developer')
  assert.equal(provider.getFallbackSearchUrl(''), 'https://bdjobs.com/h/jobs')
  assert.equal(provider.getFallbackSearchUrl('  '), 'https://bdjobs.com/h/jobs')
})

test('3. BDJobsProvider handles live search or network timeout gracefully without throwing', async () => {
  const provider = new BDJobsProvider()
  const result = await provider.search({
    query: 'Developer',
    page: 1,
    pageSize: 5,
  })

  assert.equal(result.provider, 'bdjobs')
  assert.equal(result.providerName, 'BDJobs')
  assert.ok(typeof result.totalResults === 'number')
  assert.ok(typeof result.fallbackSearchUrl === 'string')
  assert.ok(result.fallbackSearchUrl.includes('bdjobs.com'))
  assert.ok(Array.isArray(result.jobs))

  if (result.success && result.jobs.length > 0) {
    const job = result.jobs[0]
    assert.equal(job.source, 'bdjobs')
    assert.ok(job.id.startsWith('bdjobs-'))
    assert.ok(job.title.length > 0)
    assert.ok(job.company.length > 0)
    assert.ok(isValidBDJobsUrl(job.listingUrl))
  }
})

test('4. JobService caches identical search queries and serves from cache', async () => {
  jobService.clearCache()

  const params: JobSearchParams = {
    query: 'Frontend',
    page: 1,
    pageSize: 3,
  }

  const result1 = await jobService.searchJobs('bdjobs', params)

  if (result1.success && result1.providerAvailable) {
    const result2 = await jobService.searchJobs('bdjobs', params)
    assert.equal(result2.cached, true, 'Second identical request should be served from memory cache')
    assert.equal(result2.totalResults, result1.totalResults)
  }
})

test('5. JobService rejects unknown providers with truthful fallback response', async () => {
  const result = await jobService.searchJobs('unknown_provider', {
    query: 'Engineer',
  })

  assert.equal(result.success, false)
  assert.equal(result.providerAvailable, false)
  assert.ok(result.error?.includes('Unsupported job provider'))
  assert.equal(result.jobs.length, 0)
  assert.ok(result.fallbackSearchUrl.length > 0)
})

test('6. JobService supports extensible provider registration without UI refactoring', async () => {
  class MockTestProvider implements JobProvider {
    readonly id = 'mock_board'
    readonly name = 'Mock Job Board'
    readonly allowedHostnames = ['mockboard.com']

    getFallbackSearchUrl(query: string): string {
      return `https://mockboard.com/search?q=${encodeURIComponent(query)}`
    }

    async search(params: JobSearchParams): Promise<JobSearchResponse> {
      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        providerAvailable: true,
        query: params.query,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        totalResults: 1,
        totalPages: 1,
        fallbackSearchUrl: this.getFallbackSearchUrl(params.query),
        jobs: [
          {
            id: 'mock-1',
            source: this.id,
            sourceJobId: '1001',
            title: 'Mock Software Engineer',
            company: 'Mock Corp',
            location: 'Dhaka',
            employmentType: 'Full Time',
            salary: '80,000 BDT',
            experience: '3 years',
            publishedAt: '2026-10-25',
            deadline: '2026-11-25',
            summary: 'Software development role',
            listingUrl: 'https://mockboard.com/jobs/1001',
            retrievedAt: new Date().toISOString(),
          },
        ],
      }
    }
  }

  jobService.registerProvider(new MockTestProvider())
  const provider = jobService.getProvider('mock_board')
  assert.ok(provider)
  assert.equal(provider.name, 'Mock Job Board')

  const result = await jobService.searchJobs('mock_board', { query: 'Software' })
  assert.equal(result.success, true)
  assert.equal(result.jobs.length, 1)
  assert.equal(result.jobs[0].title, 'Mock Software Engineer')
  assert.equal(result.jobs[0].listingUrl, 'https://mockboard.com/jobs/1001')
})

test('7. BDJobsProvider filters intern roles when Entry Level (freshers) filter is selected', async () => {
  const provider = new BDJobsProvider()
  const result = await provider.search({
    query: 'intern',
    experience: 'freshers',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.provider, 'bdjobs')
  assert.ok(typeof result.totalResults === 'number')
  assert.ok(Array.isArray(result.jobs))

  // If live search returned results for intern query, all results should be intern/entry level
  for (const job of result.jobs) {
    const isIntern =
      job.title.toLowerCase().includes('intern') ||
      Boolean(job.employmentType?.toLowerCase().includes('intern')) ||
      Boolean(job.summary?.toLowerCase().includes('intern'))
    const exp = (job.experience || '').toLowerCase()
    const isEntryOrFresh =
      exp.includes('fresh') ||
      exp.includes('entry') ||
      exp.includes('not required') ||
      exp.includes('0') ||
      exp.includes('at most 1')

    assert.ok(
      isIntern || isEntryOrFresh,
      `Job "${job.title}" (${job.experience}) should qualify as Entry Level`
    )
  }
})
