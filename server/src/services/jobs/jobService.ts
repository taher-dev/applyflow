import type { DiscoveredJobDetail, JobProvider, JobSearchParams, JobSearchResponse } from './types.js'
import { BDJobsProvider } from './bdjobsProvider.js'

interface CacheEntry {
  data: JobSearchResponse
  expiresAt: number
}

interface DetailsCacheEntry {
  data: DiscoveredJobDetail
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const DETAILS_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const MAX_CACHE_ENTRIES = 100

class JobService {
  private providers = new Map<string, JobProvider>()
  private cache = new Map<string, CacheEntry>()
  private detailsCache = new Map<string, DetailsCacheEntry>()

  constructor() {
    this.registerProvider(new BDJobsProvider())
  }

  registerProvider(provider: JobProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider)
  }

  getProvider(providerId: string): JobProvider | undefined {
    return this.providers.get(providerId.toLowerCase())
  }

  getRegisteredProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }))
  }

  private generateCacheKey(providerId: string, params: JobSearchParams): string {
    const q = (params.query || '').trim().toLowerCase()
    const loc = (params.location || '').trim().toLowerCase()
    const emp = (params.employmentType || '').trim().toLowerCase()
    const cat = (params.category || '').trim().toLowerCase()
    const exp = (params.experience || '').trim().toLowerCase()
    const wp = (params.workplaceType || '').trim().toLowerCase()
    const pw = (params.postedWithin || '').trim().toLowerCase()
    const sal = (params.hasSalary || '').toString().trim().toLowerCase()
    const sort = (params.sortBy || '').trim().toLowerCase()
    const pg = params.page || 1
    const ps = params.pageSize || 15
    return `${providerId}:${q}:${loc}:${emp}:${cat}:${exp}:${wp}:${pw}:${sal}:${sort}:${pg}:${ps}`
  }

  private getFromCache(key: string): JobSearchResponse | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return { ...entry.data, cached: true }
  }

  private setInCache(key: string, data: JobSearchResponse): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }

  clearCache(): void {
    this.cache.clear()
    this.detailsCache.clear()
  }

  async getJobDetails(
    providerId: string = 'bdjobs',
    jobId: string
  ): Promise<DiscoveredJobDetail | null> {
    const cleanJobId = jobId.trim()
    if (!cleanJobId) return null

    const provider = this.getProvider(providerId)
    if (!provider || !provider.getJobDetails) {
      return null
    }

    const cacheKey = `${provider.id.toLowerCase()}:${cleanJobId.toLowerCase()}`
    const cached = this.detailsCache.get(cacheKey)
    if (cached && Date.now() <= cached.expiresAt) {
      return cached.data
    }

    const detail = await provider.getJobDetails(cleanJobId)
    if (detail) {
      if (this.detailsCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = this.detailsCache.keys().next().value
        if (firstKey) this.detailsCache.delete(firstKey)
      }
      this.detailsCache.set(cacheKey, {
        data: detail,
        expiresAt: Date.now() + DETAILS_CACHE_TTL_MS,
      })
    }

    return detail
  }

  async searchJobs(
    providerId: string = 'bdjobs',
    params: JobSearchParams
  ): Promise<JobSearchResponse> {
    const provider = this.getProvider(providerId)

    if (!provider) {
      return {
        success: false,
        provider: providerId,
        providerName: providerId,
        providerAvailable: false,
        query: params.query || '',
        page: params.page || 1,
        pageSize: params.pageSize || 15,
        totalResults: 0,
        totalPages: 0,
        jobs: [],
        fallbackSearchUrl: 'https://bdjobs.com/h/jobs',
        error: `Unsupported job provider: "${providerId}". Supported providers: ${Array.from(this.providers.keys()).join(', ')}`,
      }
    }

    const cacheKey = this.generateCacheKey(provider.id, params)
    const cachedResponse = this.getFromCache(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }

    const result = await provider.search(params)

    // Cache successful responses with live results
    if (result.success && result.providerAvailable) {
      this.setInCache(cacheKey, result)
    }

    return result
  }
}

export const jobService = new JobService()
