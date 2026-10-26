/**
 * Normalized model for a discovered job listing across external job providers.
 */
export interface DiscoveredJob {
  id: string
  source: string
  sourceJobId: string | null
  title: string
  company: string
  location: string | null
  employmentType: string | null
  salary: string | null
  experience: string | null
  publishedAt: string | null
  deadline: string | null
  summary: string | null
  listingUrl: string
  retrievedAt: string
}

/**
 * Common parameters for searching jobs across providers.
 */
export interface JobSearchParams {
  query: string
  location?: string | null
  employmentType?: string | null
  category?: string | null
  experience?: string | null
  workplaceType?: string | null
  postedWithin?: string | null
  hasSalary?: string | boolean | null
  sortBy?: 'relevant' | 'newest' | 'deadline' | string | null
  page?: number
  pageSize?: number
}

/**
 * Standardized search response returned by any job provider.
 */
export interface JobSearchResponse {
  success: boolean
  provider: string
  providerName: string
  providerAvailable: boolean
  query: string
  page: number
  pageSize: number
  totalResults: number
  totalPages: number
  jobs: DiscoveredJob[]
  fallbackSearchUrl: string
  cached?: boolean
  error?: string
}

/**
 * Extensible provider contract for job search integration.
 */
export interface JobProvider {
  readonly id: string
  readonly name: string
  readonly allowedHostnames: string[]
  getFallbackSearchUrl(query: string): string
  search(params: JobSearchParams): Promise<JobSearchResponse>
}
