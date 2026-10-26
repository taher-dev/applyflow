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

export interface JobSearchParams {
  query?: string
  q?: string
  location?: string
  employmentType?: string
  category?: string
  experience?: string
  workplaceType?: string
  postedWithin?: string
  hasSalary?: string | boolean
  sortBy?: 'relevant' | 'newest' | 'deadline' | string
  page?: number
  pageSize?: number
  provider?: string
}

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
