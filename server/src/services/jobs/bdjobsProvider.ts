import type { DiscoveredJob, JobProvider, JobSearchParams, JobSearchResponse } from './types.js'

const ALLOWED_BDJOBS_HOSTNAMES = ['bdjobs.com', 'jobs.bdjobs.com', 'www.bdjobs.com', 'api.bdjobs.com']
const BDJOBS_API_ENDPOINT = 'https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch'
const DEFAULT_TIMEOUT_MS = 6000

interface RawBDJobsCommon {
  total_records_found?: number | string
  total_pages?: number | string
  page_number?: number | string
  records_per_page?: number | string
}

interface RawBDJobsJob {
  Jobid?: number | string
  jobTitle?: string
  companyName?: string
  location?: string
  JobType?: string
  Salary?: string
  experience?: string
  deadlineDB?: string
  publishDate?: string
  jobCategory?: string
  StandoutJob?: number | string
  [key: string]: unknown
}

interface RawBDJobsResponse {
  common?: RawBDJobsCommon
  data?: RawBDJobsJob[]
  error?: unknown
}

/**
 * Validates that an external URL has an allowed hostname to prevent arbitrary redirects.
 */
export function isValidBDJobsUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return ALLOWED_BDJOBS_HOSTNAMES.some(
      (allowed) => parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`)
    )
  } catch {
    return false
  }
}

/**
 * Strip basic HTML tags from raw provider text if present.
 */
function cleanText(text?: unknown): string | null {
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/<[^>]*>/g, '').trim()
  return cleaned.length > 0 ? cleaned : null
}

export class BDJobsProvider implements JobProvider {
  readonly id = 'bdjobs'
  readonly name = 'BDJobs'
  readonly allowedHostnames = ALLOWED_BDJOBS_HOSTNAMES

  getFallbackSearchUrl(query: string): string {
    const encoded = encodeURIComponent(query.trim())
    return encoded ? `https://bdjobs.com/h/jobs?keyword=${encoded}` : 'https://bdjobs.com/h/jobs'
  }

  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    const query = (params.query || '').trim()
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(30, Math.max(1, params.pageSize || 15))
    const fallbackSearchUrl = this.getFallbackSearchUrl(query)

    const searchUrl = new URL(BDJOBS_API_ENDPOINT)
    searchUrl.searchParams.set('keyword', query)
    searchUrl.searchParams.set('isPro', '1')
    searchUrl.searchParams.set('pg', String(page))
    searchUrl.searchParams.set('rpp', String(pageSize))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplyFlow/1.0 JobDiscovery',
          Referer: 'https://bdjobs.com/',
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        return {
          success: false,
          provider: this.id,
          providerName: this.name,
          providerAvailable: false,
          query,
          page,
          pageSize,
          totalResults: 0,
          totalPages: 0,
          jobs: [],
          fallbackSearchUrl,
          error: `BDJobs search service responded with HTTP ${response.status}`,
        }
      }

      const json = (await response.json()) as RawBDJobsResponse
      const rawJobs = Array.isArray(json?.data) ? json.data : []
      const common = json?.common || {}

      const totalResults = Number(common.total_records_found) || rawJobs.length
      const totalPages = Number(common.total_pages) || Math.ceil(totalResults / pageSize) || 1

      const retrievedAt = new Date().toISOString()

      let normalizedJobs: DiscoveredJob[] = rawJobs
        .map((rawJob): DiscoveredJob | null => {
          const rawId = rawJob.Jobid != null ? String(rawJob.Jobid).trim() : null
          const title = cleanText(rawJob.jobTitle)
          const company = cleanText(rawJob.companyName)

          if (!title || !company) {
            return null
          }

          const listingUrl = rawId ? `https://bdjobs.com/h/details/${rawId}` : fallbackSearchUrl

          // Ensure listing URL is within allowed hostnames
          const safeListingUrl = isValidBDJobsUrl(listingUrl) ? listingUrl : fallbackSearchUrl

          return {
            id: `bdjobs-${rawId || Math.random().toString(36).slice(2, 9)}`,
            source: this.id,
            sourceJobId: rawId,
            title,
            company,
            location: cleanText(rawJob.location),
            employmentType: cleanText(rawJob.JobType),
            salary: cleanText(rawJob.Salary),
            experience: cleanText(rawJob.experience),
            publishedAt: cleanText(rawJob.publishDate),
            deadline: cleanText(rawJob.deadlineDB),
            summary: cleanText(rawJob.jobCategory),
            listingUrl: safeListingUrl,
            retrievedAt,
          }
        })
        .filter((job): job is DiscoveredJob => job !== null)

      // Apply location filter safely in memory if user requested one
      if (params.location && params.location.trim().length > 0) {
        const locLower = params.location.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter(
          (job) => job.location && job.location.toLowerCase().includes(locLower)
        )
      }

      // Apply employment type filter safely in memory if user requested one
      if (params.employmentType && params.employmentType.trim().length > 0) {
        const empLower = params.employmentType.trim().toLowerCase().replace(/[-_]/g, '')
        normalizedJobs = normalizedJobs.filter((job) => {
          if (!job.employmentType) return false
          const typeLower = job.employmentType.toLowerCase().replace(/[-_]/g, '')
          return typeLower.includes(empLower)
        })
      }

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        providerAvailable: true,
        query,
        page,
        pageSize,
        totalResults,
        totalPages,
        jobs: normalizedJobs,
        fallbackSearchUrl,
      }
    } catch (err: unknown) {
      clearTimeout(timeout)
      const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))
      const errorMessage = isTimeout
        ? 'BDJobs search request timed out'
        : 'BDJobs live search is currently unreachable'

      return {
        success: false,
        provider: this.id,
        providerName: this.name,
        providerAvailable: false,
        query,
        page,
        pageSize,
        totalResults: 0,
        totalPages: 0,
        jobs: [],
        fallbackSearchUrl,
        error: errorMessage,
      }
    }
  }
}
