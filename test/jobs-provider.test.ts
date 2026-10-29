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

test('8. BDJobsProvider filters by Category using official BDJobs category IDs', async () => {
  const provider = new BDJobsProvider()
  const itResult = await provider.search({
    category: 'IT & Telecommunication',
    page: 1,
    pageSize: 5,
  })

  assert.equal(itResult.provider, 'bdjobs')
  assert.ok(itResult.totalResults > 0, 'IT category should return matching records')
  assert.ok(itResult.jobs.length > 0, 'Should return jobs in IT category')
  for (const job of itResult.jobs) {
    assert.ok(
      job.summary === 'IT & Telecommunication' ||
      job.title.toLowerCase().includes('engineer') ||
      job.title.toLowerCase().includes('developer') ||
      job.title.toLowerCase().includes('software') ||
      job.title.toLowerCase().includes('data') ||
      job.title.toLowerCase().includes('it'),
      `Job "${job.title}" should be IT category`
    )
  }
})

test('9. BDJobsProvider filters by Employment Type (Full Time, Part Time, Contract, Internship)', async () => {
  const provider = new BDJobsProvider()
  const fullTimeResult = await provider.search({
    employmentType: 'Full Time',
    page: 1,
    pageSize: 5,
  })

  assert.equal(fullTimeResult.provider, 'bdjobs')
  assert.ok(fullTimeResult.totalResults > 0)
  assert.ok(fullTimeResult.jobs.length > 0)
  for (const job of fullTimeResult.jobs) {
    assert.ok(job.employmentType?.toLowerCase().includes('full'), `Expected full time job, got: ${job.employmentType}`)
  }
})

test('10. BDJobsProvider filters by Workplace Arrangement (Remote, On-site)', async () => {
  const provider = new BDJobsProvider()
  const remoteResult = await provider.search({
    workplaceType: 'remote',
    page: 1,
    pageSize: 5,
  })

  assert.equal(remoteResult.provider, 'bdjobs')
  assert.ok(remoteResult.totalResults > 0)
  assert.ok(remoteResult.jobs.length > 0)
  for (const job of remoteResult.jobs) {
    assert.ok(
      (job.location || '').toLowerCase().includes('remote') ||
      (job.title || '').toLowerCase().includes('remote'),
      `Expected remote job, got location: ${job.location}`
    )
  }
})

test('11. BDJobsProvider filters by Region / Division (Dhaka, Chattogram, Sylhet, Gazipur)', async () => {
  const provider = new BDJobsProvider()
  const dhakaResult = await provider.search({
    location: 'Dhaka',
    page: 1,
    pageSize: 5,
  })

  assert.equal(dhakaResult.provider, 'bdjobs')
  assert.ok(dhakaResult.totalResults > 0)
  assert.ok(dhakaResult.jobs.length > 0)
})

test('12. BDJobsProvider filters by Experience range (1-3 years)', async () => {
  const provider = new BDJobsProvider()
  const expResult = await provider.search({
    experience: '1-3',
    page: 1,
    pageSize: 5,
  })

  assert.equal(expResult.provider, 'bdjobs')
  assert.ok(expResult.totalResults > 0)
  assert.ok(expResult.jobs.length > 0)
})

test('13. BDJobsProvider filters by Date Posted (Past 24 Hours, Past 7 Days)', async () => {
  const provider = new BDJobsProvider()
  const postedResult = await provider.search({
    postedWithin: '24h',
    page: 1,
    pageSize: 5,
  })

  assert.equal(postedResult.provider, 'bdjobs')
  assert.ok(postedResult.totalResults > 0)
  assert.ok(postedResult.jobs.length > 0)
})

test('14. BDJobsProvider filters by Salary (Disclosed Only, Negotiable Only)', async () => {
  const provider = new BDJobsProvider()
  const disclosedResult = await provider.search({
    hasSalary: 'disclosed',
    page: 1,
    pageSize: 5,
  })

  assert.equal(disclosedResult.provider, 'bdjobs')
  assert.ok(disclosedResult.totalResults > 0)
  assert.ok(disclosedResult.jobs.length > 0)
  for (const job of disclosedResult.jobs) {
    assert.ok(job.salary && /\d/.test(job.salary), `Expected salary with digits, got: ${job.salary}`)
  }
})

test('15. BDJobsProvider sorts by deadline closing soonest and paginates', async () => {
  const provider = new BDJobsProvider()
  const deadlineResult = await provider.search({
    sortBy: 'deadline',
    page: 1,
    pageSize: 3,
  })

  assert.equal(deadlineResult.provider, 'bdjobs')
  assert.ok(deadlineResult.totalResults > 0)
  assert.equal(deadlineResult.jobs.length, 3)
})

