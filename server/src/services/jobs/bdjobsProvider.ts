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
const DEFAULT_TIMEOUT_MS = 10000

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
  Cat_id?: number | string
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
 * Clean experience text from provider.
 */
function normalizeJobExperience(rawExp?: unknown): string | null {
  const cleaned = cleanText(rawExp)
  if (
    !cleaned ||
    cleaned === '--' ||
    cleaned.toLowerCase().includes('not mentioned') ||
    cleaned.toLowerCase().includes('n/a')
  ) {
    return null
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

/**
 * Format deadline into a clean date string (e.g. Oct 31, 2026).
 */
export function normalizeJobDeadline(rawDeadline?: unknown): string | null {
  const cleaned = cleanText(rawDeadline)
  if (!cleaned) return null

  const stripped = cleaned.replace(/^(due|deadline|application deadline|closing)[:\s]*/i, '').trim()
  if (!stripped) return null

  // 1. ISO or YYYY-MM-DD / YYYY/MM/DD
  const isoMatch = stripped.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10) - 1
    const d = parseInt(isoMatch[3], 10)
    const date = new Date(y, m, d)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = stripped.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10) - 1
    const y = parseInt(dmyMatch[3], 10)
    const date = new Date(y, m, d)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  // 3. Fallback Date parsing
  const parsed = new Date(stripped)
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return cleaned
}

export function normalizeJobType(rawType?: unknown): string | null {
  const cleaned = cleanText(rawType)
  if (!cleaned) return null
  const lower = cleaned.toLowerCase()
  if (lower === 'fulltime') return 'Full Time'
  if (lower === 'parttime') return 'Part Time'
  if (lower === 'intern') return 'Internship'
  if (lower.includes('fulltime') && lower.includes('parttime')) return 'Full Time, Part Time'
  return cleaned
}

export const BDJOBS_CATEGORY_TO_ID: Record<string, number> = {
  'it & telecommunication': 8,
  'it': 8,
  'telecommunication': 8,
  'accounting': 1,
  'finance': 1,
  'bank': 2,
  'marketing': 9,
  'sales': 9,
  'engineer': 4,
  'architect': 5,
  'customer service': 16,
  'medical': 11,
  'pharma': 29,
  'education': 13,
  'training': 13,
  'design': 18,
  'creative': 18,
  'hr': 17,
  'garments': 6,
  'textile': 6,
  'supply chain': 3,
  'commercial': 27,
  'management': 7,
  'admin': 7,
  'ngo': 12,
  'development': 12,
  'media': 10,
  'data entry': 15,
}

export const BDJOBS_ID_TO_CATEGORY: Record<number, string> = {
  1: 'Accounting / Finance',
  2: 'Bank / Non-Bank Fin. Inst.',
  3: 'Commercial / Supply Chain',
  4: 'Engineer / Architect',
  5: 'Engineer / Architect',
  6: 'Garments / Textile',
  7: 'General Management / Admin',
  8: 'IT & Telecommunication',
  9: 'Marketing / Sales',
  10: 'Media / Event Mgt.',
  11: 'Medical / Pharma',
  12: 'NGO / Development',
  13: 'Education / Training',
  14: 'Secretary / Receptionist',
  15: 'Data Entry / Operator',
  16: 'Customer Service / Call Centre',
  17: 'HR / Org. Development',
  18: 'Design / Creative',
  19: 'Production / Operations',
  20: 'Hospitality / Travel / Tourism',
  22: 'Law / Legal',
  27: 'Commercial / Supply Chain',
  29: 'Medical / Pharma',
  30: 'Media / Event Mgt.',
}

export const BDJOBS_JOB_NATURE_MAP: Record<string, string> = {
  'full time': 'FullTime',
  'fulltime': 'FullTime',
  'part time': 'PartTime',
  'parttime': 'PartTime',
  'contract': 'Contract',
  'contractual': 'Contract',
  'internship': 'Intern',
  'intern': 'Intern',
}

export const BDJOBS_LOCATION_TO_ID: Record<string, string> = {
  dhaka: '1003',
  chattogram: '1002',
  chittagong: '1002',
  ctg: '1002',
  sylhet: '1008',
  rajshahi: '1006',
  khulna: '1004',
  barishal: '1001',
  barisal: '1001',
  rangpur: '1007',
  mymensingh: '1005',
  gazipur: '19',
  narayanganj: '43',
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

    let targetCatId: number | undefined
    if (params.category && params.category.trim().length > 0) {
      const catKey = params.category.trim().toLowerCase()
      targetCatId = BDJOBS_CATEGORY_TO_ID[catKey]
      if (targetCatId === undefined) {
        for (const [key, id] of Object.entries(BDJOBS_CATEGORY_TO_ID)) {
          if (catKey.includes(key) || key.includes(catKey)) {
            targetCatId = id
            break
          }
        }
      }
    }

    let targetJobNature: string | undefined
    if (params.employmentType && params.employmentType.trim().length > 0) {
      const empKey = params.employmentType.trim().toLowerCase()
      targetJobNature = BDJOBS_JOB_NATURE_MAP[empKey]
      if (targetJobNature === undefined) {
        for (const [key, nature] of Object.entries(BDJOBS_JOB_NATURE_MAP)) {
          if (empKey.includes(key) || key.includes(empKey)) {
            targetJobNature = nature
            break
          }
        }
      }
    }

    let targetLocId: string | undefined
    if (params.location && params.location.trim().length > 0) {
      const locKey = params.location.trim().toLowerCase()
      targetLocId = BDJOBS_LOCATION_TO_ID[locKey]
      if (targetLocId === undefined) {
        for (const [key, id] of Object.entries(BDJOBS_LOCATION_TO_ID)) {
          if (locKey.includes(key) || key.includes(locKey)) {
            targetLocId = id
            break
          }
        }
      }
    }

    const hasUnmappedClientFilters = Boolean(
      (params.location &&
        params.location.trim().length > 0 &&
        !targetLocId &&
        params.location.trim().toLowerCase() !== 'remote') ||
      (params.workplaceType && params.workplaceType.trim().toLowerCase() === 'hybrid')
    )
    const fetchRpp = hasUnmappedClientFilters ? 50 : pageSize

    const searchUrl = new URL(BDJOBS_API_ENDPOINT)
    searchUrl.searchParams.set('keyword', query)
    searchUrl.searchParams.set('isPro', '1')
    searchUrl.searchParams.set('ToggleJobs', 'true')
    searchUrl.searchParams.set('pg', String(page))
    searchUrl.searchParams.set('rpp', String(fetchRpp))
    if (targetCatId != null) {
      searchUrl.searchParams.set('Category', String(targetCatId))
    }
    if (targetJobNature != null) {
      searchUrl.searchParams.set('jobNature', targetJobNature)
    }
    if (targetLocId != null) {
      searchUrl.searchParams.set('location', targetLocId)
    } else if (params.location && params.location.trim().toLowerCase() === 'remote') {
      searchUrl.searchParams.set('workplace', '1')
    }
    if (params.workplaceType && params.workplaceType.trim().length > 0) {
      const wp = params.workplaceType.trim().toLowerCase()
      if (wp === 'remote') {
        searchUrl.searchParams.set('workplace', '1')
      } else if (wp === 'onsite' || wp === 'on-site') {
        searchUrl.searchParams.set('workplace', '0')
      }
    }
    if (params.experience && params.experience.trim().length > 0) {
      const expKey = params.experience.trim().toLowerCase()
      if (expKey === 'freshers' || expKey === 'entry' || expKey.includes('entry') || expKey.includes('fresher')) {
        searchUrl.searchParams.set('isFresher', 'true')
      } else if (expKey === '1-3' || expKey === '1_3') {
        searchUrl.searchParams.set('experience', '1/3')
      } else if (expKey === '3-5' || expKey === '3_5') {
        searchUrl.searchParams.set('experience', '3/5')
      } else if (expKey === '5plus' || expKey === '5+') {
        searchUrl.searchParams.set('experience', '5/10')
      }
    }
    if (params.postedWithin && params.postedWithin.trim().length > 0) {
      const pw = params.postedWithin.trim().toLowerCase()
      if (pw === '24h' || pw === '1d' || pw === '1') {
        searchUrl.searchParams.set('postedWithin', '1')
      } else if (pw === '3d' || pw === '3') {
        searchUrl.searchParams.set('postedWithin', '3')
      } else if (pw === '7d' || pw === '1w' || pw === '7') {
        searchUrl.searchParams.set('postedWithin', '7')
      } else if (pw === '30d' || pw === '1m' || pw === '30') {
        searchUrl.searchParams.set('postedWithin', '30')
      }
    }
    if (params.hasSalary != null && String(params.hasSalary).trim().length > 0) {
      const salParam = String(params.hasSalary).trim().toLowerCase()
      if (salParam === 'disclosed' || salParam === 'true') {
        searchUrl.searchParams.set('Salary', '1/1000000')
      } else if (salParam === 'negotiable') {
        searchUrl.searchParams.set('Salary', '0/0')
      }
    }
    if (params.sortBy === 'deadline') {
      searchUrl.searchParams.set('deadline', '2')
    }

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

          const rawCatId = rawJob.Cat_id != null ? Number(rawJob.Cat_id) : undefined
          const categoryName = (rawCatId && BDJOBS_ID_TO_CATEGORY[rawCatId]) || cleanText(rawJob.jobCategory)

          const isHomeWorkplace =
            typeof rawJob.WorkPlace === 'string' &&
            (rawJob.WorkPlace.toLowerCase() === 'home' || rawJob.WorkPlace === '1')
          let loc = cleanText(rawJob.location)
          if (isHomeWorkplace) {
            if (!loc) {
              loc = 'Remote'
            } else if (!loc.toLowerCase().includes('remote')) {
              loc = `${loc} (Remote)`
            }
          }

          return {
            id: `bdjobs-${rawId || Math.random().toString(36).slice(2, 9)}`,
            source: this.id,
            sourceJobId: rawId,
            title,
            company,
            location: loc,
            employmentType: normalizeJobType(rawJob.JobType),
            salary: normalizeJobSalary(rawJob.Salary),
            experience: normalizeJobExperience(rawJob.experience),
            publishedAt: cleanText(rawJob.publishDate),
            deadline: normalizeJobDeadline(rawJob.deadlineDB),
            summary: categoryName,
            listingUrl: safeListingUrl,
            retrievedAt,
          }
        })
        .filter((job): job is DiscoveredJob => job !== null)

      // Apply location filter safely in memory if user requested one
      if (params.location && params.location.trim().length > 0) {
        const locLower = params.location.trim().toLowerCase()
        if (locLower === 'remote') {
          normalizedJobs = normalizedJobs.filter(
            (job) => job.location && job.location.toLowerCase().includes('remote')
          )
        } else if (!targetLocId) {
          // Freeform / sub-area search (e.g. "Banani", "Uttara")
          normalizedJobs = normalizedJobs.filter(
            (job) => job.location && job.location.toLowerCase().includes(locLower)
          )
        }
      }

      // Apply employment type filter safely in memory if user requested one
      if (params.employmentType && params.employmentType.trim().length > 0) {
        const empLower = params.employmentType.trim().toLowerCase().replace(/[\s-_]/g, '')
        normalizedJobs = normalizedJobs.filter((job) => {
          if (!job.employmentType) return false
          const typeLower = job.employmentType.toLowerCase().replace(/[\s-_]/g, '')
          if (empLower.includes('intern') || empLower === 'internship') {
            return typeLower.includes('intern') || job.title.toLowerCase().includes('intern')
          }
          if (empLower.includes('full')) {
            return typeLower.includes('full')
          }
          if (empLower.includes('part')) {
            return typeLower.includes('part')
          }
          if (empLower.includes('contract')) {
            return typeLower.includes('contract')
          }
          return typeLower.includes(empLower)
        })
      }

      // Apply category filter (matches mapped Category ID, summary, or title)
      if (params.category && params.category.trim().length > 0) {
        const catLower = params.category.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter((job) => {
          if (targetCatId != null && job.summary) {
            const expectedName = BDJOBS_ID_TO_CATEGORY[targetCatId]?.toLowerCase()
            if (expectedName && job.summary.toLowerCase() === expectedName) {
              return true
            }
          }
          return (
            (job.summary && job.summary.toLowerCase().includes(catLower)) ||
            job.title.toLowerCase().includes(catLower)
          )
        })
      }

      // Apply experience filter (job roles containing intern are classified as entry level)
      if (params.experience && params.experience.trim().length > 0) {
        const expKey = params.experience.trim().toLowerCase()
        normalizedJobs = normalizedJobs.filter((job) => {
          const isIntern =
            job.title.toLowerCase().includes('intern') ||
            Boolean(job.employmentType?.toLowerCase().includes('intern')) ||
            Boolean(job.summary?.toLowerCase().includes('intern'))

          if (
            expKey === 'freshers' ||
            expKey === 'entry' ||
            expKey.includes('entry') ||
            expKey.includes('fresher')
          ) {
            if (isIntern) return true
            if (!job.experience) return true
            const expText = job.experience.toLowerCase()
            return (
              expText.includes('fresh') ||
              expText.includes('entry') ||
              expText.includes('intern') ||
              expText.includes('not required') ||
              expText.includes('no experience') ||
              expText.includes('0') ||
              expText.includes('at most 1') ||
              expText.includes('1 to 2') ||
              expText.includes('0 to 2') ||
              expText.includes('0 to 1') ||
              expText === 'na' ||
              job.title.toLowerCase().includes('junior') ||
              job.title.toLowerCase().includes('trainee')
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
          if (pw === '24h' || pw === '1d' || pw === '1') return diffHours <= 36
          if (pw === '3d' || pw === '3') return diffHours <= 84
          if (pw === '7d' || pw === '1w' || pw === '7') return diffHours <= 180
          if (pw === '30d' || pw === '1m' || pw === '30') return diffHours <= 744
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

      const startIndex = Math.max(0, (page - 1) * pageSize)
      const pagedJobs = hasUnmappedClientFilters
        ? normalizedJobs.slice(startIndex, startIndex + pageSize)
        : normalizedJobs.slice(0, pageSize)
      const finalTotalResults = hasUnmappedClientFilters ? normalizedJobs.length : totalResults
      const finalTotalPages = hasUnmappedClientFilters
        ? Math.max(1, Math.ceil(normalizedJobs.length / pageSize))
        : totalPages

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        providerAvailable: true,
        query,
        page,
        pageSize,
        totalResults: finalTotalResults,
        totalPages: finalTotalPages,
        jobs: pagedJobs,
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
        experience: normalizeJobExperience(rawDetail.experience),
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
        deadline: normalizeJobDeadline(rawDetail.Deadline || rawDetail.DeadlineDB),
        summary: cleanText(rawDetail.jobCategory || rawDetail.CategoryName),
        listingUrl: safeListingUrl,
        retrievedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }
}
