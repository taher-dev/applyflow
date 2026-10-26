import type { DiscoveredJob, DiscoveredJobDetail, JobProvider, JobSearchParams, JobSearchResponse } from './types.js'

const ALLOWED_BDJOBS_HOSTNAMES = [
  'bdjobs.com',
  'jobs.bdjobs.com',
  'www.bdjobs.com',
  'api.bdjobs.com',
  'gateway.bdjobs.com',
  'storage.googleapis.com',
]
const BDJOBS_API_ENDPOINT = 'https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch'
const BDJOBS_DETAILS_API_ENDPOINT = 'https://gateway.bdjobs.com/ActtivejobsTest/api/JobSubsystem/jobDetails'
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
  premiumData?: RawBDJobsJob[]
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

/**
 * Format experience text, ensuring intern roles are explicitly classified as Entry Level.
 */
function normalizeJobExperience(title: string, rawExp?: unknown): string | null {
  const cleaned = cleanText(rawExp)
  const isIntern = title.toLowerCase().includes('intern')
  if (isIntern) {
    if (
      !cleaned ||
      cleaned === '--' ||
      cleaned.toLowerCase().includes('not mentioned') ||
      cleaned.toLowerCase().includes('n/a')
    ) {
      return 'Entry Level (Internship)'
    }
    if (!cleaned.toLowerCase().includes('entry') && !cleaned.toLowerCase().includes('intern')) {
      return `Entry Level (${cleaned})`
    }
    return cleaned
  }
  return cleaned
}

/**
 * Format salary text, providing 'Tk. --' placeholder when salary is not defined.
 */
function normalizeJobSalary(rawSalary?: unknown): string {
  const cleaned = cleanText(rawSalary)
  if (
    !cleaned ||
    cleaned === '--' ||
    cleaned === '-' ||
    cleaned.toLowerCase() === 'not mentioned' ||
    cleaned.toLowerCase() === 'undisclosed'
  ) {
    return 'Tk. --'
  }
  return cleaned
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
      const rawJobs = [
        ...(Array.isArray(json?.data) ? json.data : []),
        ...(Array.isArray(json?.premiumData) ? json.premiumData : []),
      ]
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
            salary: normalizeJobSalary(rawJob.Salary),
            experience: normalizeJobExperience(title, rawJob.experience),
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

      // Apply category filter (matches rawJob.jobCategory in summary or title)
      if (params.category && params.category.trim().length > 0) {
        const catLower = params.category.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter(
          (job) =>
            (job.summary && job.summary.toLowerCase().includes(catLower)) ||
            job.title.toLowerCase().includes(catLower)
        )
      }

      // Apply experience filter (job roles containing intern are classified as entry level)
      if (params.experience && params.experience.trim().length > 0) {
        const expKey = params.experience.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter((job) => {
          const isIntern = job.title.toLowerCase().includes('intern')

          if (expKey === 'freshers' || expKey === 'entry') {
            if (isIntern) return true
            if (!job.experience) return false
            const expText = job.experience.toLowerCase()
            return (
              expText.includes('fresh') ||
              expText.includes('entry') ||
              expText.includes('intern') ||
              expText.includes('not required') ||
              expText.includes('no experience') ||
              expText.includes('0') ||
              expText.includes('at most 1')
            )
          }
          if (expKey === '1-3' || expKey === '1_3') {
            if (!job.experience) return false
            const expText = job.experience.toLowerCase()
            return expText.includes('1') || expText.includes('2') || expText.includes('3')
          }
          if (expKey === '3-5' || expKey === '3_5') {
            if (!job.experience) return false
            const expText = job.experience.toLowerCase()
            return expText.includes('3') || expText.includes('4') || expText.includes('5')
          }
          if (expKey === '5plus' || expKey === '5+') {
            if (!job.experience) return false
            const expText = job.experience.toLowerCase()
            return (
              expText.includes('5') ||
              expText.includes('6') ||
              expText.includes('7') ||
              expText.includes('8') ||
              expText.includes('10') ||
              expText.includes('senior')
            )
          }
          return (job.experience || '').toLowerCase().includes(expKey)
        })
      }

      // Apply workplace type filter
      if (params.workplaceType && params.workplaceType.trim().length > 0) {
        const wp = params.workplaceType.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter((job) => {
          const loc = (job.location || '').toLowerCase()
          const title = job.title.toLowerCase()
          if (wp === 'remote') {
            return loc.includes('remote') || loc.includes('home') || title.includes('remote')
          }
          if (wp === 'hybrid') {
            return loc.includes('hybrid') || title.includes('hybrid')
          }
          if (wp === 'onsite' || wp === 'on-site') {
            return !loc.includes('remote') && !loc.includes('home')
          }
          return true
        })
      }

      // Apply salary disclosure filter
      if (params.hasSalary != null && String(params.hasSalary).trim().length > 0) {
        const salParam = String(params.hasSalary).trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter((job) => {
          if (!job.salary) return false
          const salText = job.salary.toLowerCase()
          if (salParam === 'disclosed' || salParam === 'true') {
            return !salText.includes('negotiable') && !salText.includes('--') && /\d/.test(salText)
          }
          if (salParam === 'negotiable') {
            return salText.includes('negotiable') || salText === 'tk. --'
          }
          return true
        })
      }

      // Apply date posted within filter
      if (params.postedWithin && params.postedWithin.trim().length > 0) {
        const pw = params.postedWithin.trim().toLowerCase()
        const nowMs = Date.now()
        normalizedJobs = normalizedJobs.filter((job) => {
          if (!job.publishedAt) return true
          const pubMs = new Date(job.publishedAt).getTime()
          if (isNaN(pubMs)) return true
          const diffHours = (nowMs - pubMs) / (1000 * 60 * 60)
          if (pw === '24h' || pw === '1d') return diffHours <= 24
          if (pw === '3d') return diffHours <= 72
          if (pw === '7d' || pw === '1w') return diffHours <= 168
          if (pw === '30d' || pw === '1m') return diffHours <= 720
          return true
        })
      }

      // Apply sorting
      if (params.sortBy) {
        if (params.sortBy === 'newest') {
          normalizedJobs.sort((a, b) => {
            const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
            const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
            return timeB - timeA
          })
        } else if (params.sortBy === 'deadline') {
          normalizedJobs.sort((a, b) => {
            const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity
            const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity
            return timeA - timeB
          })
        }
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

  /**
   * Fetches the complete job detail from BDJobs Gateway API.
   */
  async getJobDetails(jobId: string): Promise<DiscoveredJobDetail | null> {
    const cleanId = jobId.replace(/^bdjobs-/i, '').trim()
    if (!cleanId) return null

    const listingUrl = `https://bdjobs.com/h/details/${cleanId}`
    const safeListingUrl = isValidBDJobsUrl(listingUrl) ? listingUrl : this.getFallbackSearchUrl('')

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      const url = `${BDJOBS_DETAILS_API_ENDPOINT}?jobId=${encodeURIComponent(cleanId)}`
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      })
      clearTimeout(timeout)

      if (!response.ok) {
        return null
      }

      const json = (await response.json()) as {
        data?: Array<Record<string, unknown>>
      }
      const rawDetail = Array.isArray(json?.data) ? json.data[0] : null
      if (!rawDetail || String(rawDetail.JobFound).toLowerCase() === 'false') {
        return null
      }

      const title = cleanText(rawDetail.JobTitle) || 'Untitled Position'
      const company = cleanText(rawDetail.CompnayName || rawDetail.CompanyNameENG) || 'Confidential'
      const rawLogo = rawDetail.JobLOgoName ? String(rawDetail.JobLOgoName).trim() : null
      const companyLogo =
        rawLogo && (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) ? rawLogo : null

      const skillsRaw = rawDetail.SuggestedSkills || rawDetail.SkillsRequired
      const skills =
        typeof skillsRaw === 'string'
          ? skillsRaw
              .split(',')
              .map((s) => cleanText(s))
              .filter((s): s is string => Boolean(s))
          : []

      const vacancies = cleanText(rawDetail.JobVacancies)
      const validVacancies = vacancies && vacancies !== '--' ? vacancies : null

      return {
        id: `bdjobs-${cleanId}`,
        source: this.id,
        sourceJobId: cleanId,
        title,
        company,
        companyLogo,
        companyAddress: cleanText(rawDetail.CompanyAddress),
        companyBusiness: cleanText(rawDetail.CompanyBusiness),
        companyWebsite: cleanText(rawDetail.CompanyWeb),
        location: cleanText(rawDetail.JobLocation),
        employmentType: cleanText(rawDetail.JobNature),
        workplace: cleanText(rawDetail.JobWorkPlace),
        vacancies: validVacancies,
        salary: normalizeJobSalary(rawDetail.JobSalaryRangeText || rawDetail.JobSalaryRange),
        experience: normalizeJobExperience(title, rawDetail.experience),
        educationRequirements: rawDetail.EducationRequirements
          ? String(rawDetail.EducationRequirements).trim()
          : null,
        additionalRequirements: rawDetail.AdditionJobRequirements
          ? String(rawDetail.AdditionJobRequirements).trim()
          : null,
        responsibilities: rawDetail.JobDescription ? String(rawDetail.JobDescription).trim() : null,
        skills,
        otherBenefits:
          rawDetail.OtherBenefits || rawDetail.JobOtherBenifits
            ? String(rawDetail.OtherBenefits || rawDetail.JobOtherBenifits).trim()
            : null,
        applyInstruction: cleanText(rawDetail.ApplyInstruction),
        applyUrl: rawDetail.ApplyURL
          ? String(rawDetail.ApplyURL).trim()
          : rawDetail.ApplyRedirectUrl
          ? `https:${rawDetail.ApplyRedirectUrl}`
          : null,
        ageLimit: cleanText(rawDetail.Age) && rawDetail.Age !== 'Na' ? cleanText(rawDetail.Age) : null,
        gender: cleanText(rawDetail.Gender),
        jobContext: cleanText(rawDetail.Context),
        publishedAt: cleanText(rawDetail.PostedOn),
        deadline: cleanText(rawDetail.Deadline || rawDetail.DeadlineDB),
        summary: cleanText(rawDetail.jobCategory || rawDetail.CategoryName),
        listingUrl: safeListingUrl,
        retrievedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }
}
