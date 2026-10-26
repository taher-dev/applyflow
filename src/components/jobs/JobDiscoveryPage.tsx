import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  ExternalLink,
  Bookmark,
  Check,
  RotateCcw,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import type { DiscoveredJob, JobSearchResponse } from '@/types/job'
import type { JobApplication, WorkplaceType, EmploymentType } from '@/types/dashboard'
import { toast } from 'sonner'

interface JobDiscoveryPageProps {
  existingApplications: JobApplication[]
  onSaveJob: (appData: Omit<JobApplication, 'id'>) => Promise<JobApplication>
  onNavigateToApplications?: () => void
}

const BDJOBS_CATEGORIES = [
  { label: 'All Functional Categories', value: '' },
  { label: 'IT & Telecommunication', value: 'IT & Telecommunication' },
  { label: 'Accounting / Finance', value: 'Accounting' },
  { label: 'Bank / Non-Bank Fin. Inst.', value: 'Bank' },
  { label: 'Marketing / Sales', value: 'Marketing' },
  { label: 'Engineer / Architect', value: 'Engineer' },
  { label: 'Customer Service / Call Centre', value: 'Customer Service' },
  { label: 'Medical / Pharma', value: 'Medical' },
  { label: 'Education / Training', value: 'Education' },
  { label: 'Design / Creative', value: 'Design' },
  { label: 'HR / Org. Development', value: 'HR' },
  { label: 'Garments / Textile', value: 'Garments' },
  { label: 'Commercial / Supply Chain', value: 'Supply Chain' },
  { label: 'General Management / Admin', value: 'Management' },
  { label: 'NGO / Development', value: 'NGO' },
  { label: 'Media / Event Mgt.', value: 'Media' },
  { label: 'Data Entry / Operator', value: 'Data Entry' },
]

const BDJOBS_DIVISIONS = [
  { label: 'All Bangladesh', value: '' },
  { label: 'Dhaka', value: 'Dhaka' },
  { label: 'Chattogram', value: 'Chattogram' },
  { label: 'Sylhet', value: 'Sylhet' },
  { label: 'Rajshahi', value: 'Rajshahi' },
  { label: 'Khulna', value: 'Khulna' },
  { label: 'Barishal', value: 'Barishal' },
  { label: 'Rangpur', value: 'Rangpur' },
  { label: 'Mymensingh', value: 'Mymensingh' },
  { label: 'Gazipur', value: 'Gazipur' },
  { label: 'Narayanganj', value: 'Narayanganj' },
  { label: 'Remote / Anywhere', value: 'Remote' },
]

const BDJOBS_EMPLOYMENT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Full Time', value: 'Full Time' },
  { label: 'Part Time', value: 'Part Time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Internship', value: 'Internship' },
]

const BDJOBS_EXPERIENCES = [
  { label: 'Any Experience', value: '' },
  { label: 'Freshers / Entry Level', value: 'freshers' },
  { label: '1 - 3 Years', value: '1-3' },
  { label: '3 - 5 Years', value: '3-5' },
  { label: '5+ Years (Senior)', value: '5plus' },
]

const BDJOBS_WORKPLACES = [
  { label: 'All Arrangements', value: '' },
  { label: 'On-site', value: 'onsite' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' },
]

const BDJOBS_SALARY_OPTIONS = [
  { label: 'All Salaries', value: '' },
  { label: 'Disclosed Salary Only', value: 'disclosed' },
  { label: 'Negotiable Only', value: 'negotiable' },
]

const BDJOBS_POSTED_OPTIONS = [
  { label: 'Any Time', value: '' },
  { label: 'Past 24 Hours', value: '24h' },
  { label: 'Past 3 Days', value: '3d' },
  { label: 'Past 7 Days', value: '7d' },
  { label: 'Past 30 Days', value: '30d' },
]

const BDJOBS_SORT_OPTIONS = [
  { label: 'Most Relevant', value: 'relevant' },
  { label: 'Newly Published', value: 'newest' },
  { label: 'Deadline Closing Soon', value: 'deadline' },
]

const AVATAR_PALETTES = [
  'bg-blue-50 text-blue-700 border-blue-200/60',
  'bg-purple-50 text-purple-700 border-purple-200/60',
  'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'bg-amber-50 text-amber-700 border-amber-200/60',
  'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  'bg-rose-50 text-rose-700 border-rose-200/60',
  'bg-teal-50 text-teal-700 border-teal-200/60',
  'bg-slate-100 text-slate-700 border-slate-200/60',
]

function getCompanyInitials(name: string): string {
  if (!name) return 'JO'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getCompanyAvatarTheme(name: string): string {
  if (!name) return AVATAR_PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[index]
}

export function JobDiscoveryPage({
  existingApplications,
  onSaveJob,
  onNavigateToApplications,
}: JobDiscoveryPageProps) {
  // Search parameters
  const [keywordInput, setKeywordInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [activeLocation, setActiveLocation] = useState('')
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedExperience, setSelectedExperience] = useState('')
  const [selectedWorkplace, setSelectedWorkplace] = useState('')
  const [selectedSalary, setSelectedSalary] = useState('')
  const [selectedPostedWithin, setSelectedPostedWithin] = useState('')
  const [selectedSortBy, setSelectedSortBy] = useState('relevant')
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [searchResponse, setSearchResponse] = useState<JobSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)

  // Fast duplicate lookups
  const savedJobIdentifiers = useMemo(() => {
    const ids = new Set<string>()
    for (const app of existingApplications) {
      if (app.sourceJobId) ids.add(`id:${app.sourceJobId}`)
      if (app.jobUrl) ids.add(`url:${app.jobUrl}`)
    }
    return ids
  }, [existingApplications])

  const isJobAlreadySaved = useCallback(
    (job: DiscoveredJob): boolean => {
      if (job.sourceJobId && savedJobIdentifiers.has(`id:${job.sourceJobId}`)) {
        return true
      }
      if (job.listingUrl && savedJobIdentifiers.has(`url:${job.listingUrl}`)) {
        return true
      }
      return false
    },
    [savedJobIdentifiers]
  )

  // Fetch search results
  useEffect(() => {
    let cancelled = false

    api.jobs
      .search({
        query: activeQuery,
        location: activeLocation || undefined,
        employmentType: selectedEmploymentType || undefined,
        category: selectedCategory || undefined,
        experience: selectedExperience || undefined,
        workplaceType: selectedWorkplace || undefined,
        hasSalary: selectedSalary || undefined,
        postedWithin: selectedPostedWithin || undefined,
        sortBy: selectedSortBy || undefined,
        page: currentPage,
        pageSize: 12,
      })
      .then((response) => {
        if (!cancelled) {
          setSearchResponse(response)
          setError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Unable to connect to BDJobs. Please check your network and try again.'
          setError(message)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    activeQuery,
    activeLocation,
    selectedEmploymentType,
    selectedCategory,
    selectedExperience,
    selectedWorkplace,
    selectedSalary,
    selectedPostedWithin,
    selectedSortBy,
    currentPage,
    retryTrigger,
  ])

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    setRetryTrigger((prev) => prev + 1)
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setActiveQuery(keywordInput.trim())
    setActiveLocation(locationInput.trim())
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setIsLoading(true)
    setKeywordInput('')
    setActiveQuery('')
    setLocationInput('')
    setActiveLocation('')
    setSelectedEmploymentType('')
    setSelectedCategory('')
    setSelectedExperience('')
    setSelectedWorkplace('')
    setSelectedSalary('')
    setSelectedPostedWithin('')
    setSelectedSortBy('relevant')
    setCurrentPage(1)
  }

  const handleRemoveFilter = (filterKey: string) => {
    setIsLoading(true)
    setCurrentPage(1)
    if (filterKey === 'location') {
      setLocationInput('')
      setActiveLocation('')
    } else if (filterKey === 'employmentType') {
      setSelectedEmploymentType('')
    } else if (filterKey === 'category') {
      setSelectedCategory('')
    } else if (filterKey === 'experience') {
      setSelectedExperience('')
    } else if (filterKey === 'workplace') {
      setSelectedWorkplace('')
    } else if (filterKey === 'salary') {
      setSelectedSalary('')
    } else if (filterKey === 'postedWithin') {
      setSelectedPostedWithin('')
    } else if (filterKey === 'query') {
      setKeywordInput('')
      setActiveQuery('')
    }
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (activeLocation) count++
    if (selectedEmploymentType) count++
    if (selectedCategory) count++
    if (selectedExperience) count++
    if (selectedWorkplace) count++
    if (selectedSalary) count++
    if (selectedPostedWithin) count++
    return count
  }, [
    activeLocation,
    selectedEmploymentType,
    selectedCategory,
    selectedExperience,
    selectedWorkplace,
    selectedSalary,
    selectedPostedWithin,
  ])

  const handleSaveToApplyFlow = async (job: DiscoveredJob) => {
    if (isJobAlreadySaved(job)) {
      toast.info('Already tracked', {
        description: `"${job.title}" at ${job.company} is already in your tracker.`,
        action: onNavigateToApplications
          ? {
              label: 'View in Tracker',
              onClick: onNavigateToApplications,
            }
          : undefined,
      })
      return
    }

    setSavingJobId(job.id)

    const workplaceType: WorkplaceType =
      job.location && job.location.toLowerCase().includes('remote')
        ? 'Remote'
        : job.location && job.location.toLowerCase().includes('hybrid')
        ? 'Hybrid'
        : 'On-site'

    let employmentType: EmploymentType | undefined = undefined
    if (job.employmentType) {
      const etLower = job.employmentType.toLowerCase()
      if (etLower.includes('full')) employmentType = 'Full-time'
      else if (etLower.includes('part')) employmentType = 'Part-time'
      else if (etLower.includes('contract')) employmentType = 'Contract'
      else if (etLower.includes('intern')) employmentType = 'Internship'
    }

    const applicationPayload: Omit<JobApplication, 'id'> = {
      company: job.company,
      role: job.title,
      location: job.location || undefined,
      workplaceType,
      employmentType,
      jobUrl: job.listingUrl,
      source: job.source,
      sourceJobId: job.sourceJobId || undefined,
      salary: job.salary || undefined,
      appliedDate: new Date().toISOString().slice(0, 10),
      status: 'Saved',
      notes: job.experience ? `Required Experience: ${job.experience}` : undefined,
    }

    try {
      await onSaveJob(applicationPayload)
      toast.success('Saved to ApplyFlow!', {
        description: `"${job.title}" added to your saved jobs.`,
        action: onNavigateToApplications
          ? {
              label: 'View Tracker',
              onClick: onNavigateToApplications,
            }
          : undefined,
      })
    } catch (err) {
      const isConflict =
        (err instanceof ApiError && err.status === 409) ||
        (err instanceof Error && err.message.toLowerCase().includes('already saved'))
      if (isConflict) {
        toast.info('Already in your tracker', {
          description: `"${job.title}" is already tracked.`,
        })
      } else {
        toast.error('Failed to save job', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    } finally {
      setSavingJobId(null)
    }
  }

  const jobs = searchResponse?.jobs || []
  const totalResults = searchResponse?.totalResults || 0
  const totalPages = searchResponse?.totalPages || 1
  const isProviderAvailable = searchResponse?.providerAvailable ?? true
  const fallbackUrl =
    searchResponse?.fallbackSearchUrl ||
    (activeQuery
      ? `https://bdjobs.com/h/jobs?keyword=${encodeURIComponent(activeQuery)}`
      : 'https://bdjobs.com/h/jobs')

  const hasActiveFilters = Boolean(
    keywordInput ||
      locationInput ||
      activeQuery ||
      activeLocation ||
      selectedEmploymentType ||
      selectedCategory ||
      selectedExperience ||
      selectedWorkplace ||
      selectedSalary ||
      selectedPostedWithin ||
      (selectedSortBy && selectedSortBy !== 'relevant')
  )

  return (
    <div className="w-full space-y-4">
      {/* Modern Minimal Search Bar & Comprehensive Filters */}
      <div className="space-y-2.5">
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors p-1.5 sm:p-2 flex flex-col sm:flex-row sm:items-center gap-2"
        >
          {/* Keyword Field */}
          <div className="relative flex-1 flex items-center min-w-0">
            <Search className="size-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              id="job-keyword-input"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Search job title, skills, or company..."
              className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none focus:ring-0"
            />
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          {/* Location Field */}
          <div className="relative sm:w-52 flex items-center min-w-0">
            <MapPin className="size-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              id="job-location-input"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Location (e.g. Dhaka, Remote)..."
              className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none focus:ring-0"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0">
            {/* Comprehensive BDJobs Filters Toggle */}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={cn(
                'h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer',
                isFilterPanelOpen || activeFiltersCount > 0
                  ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                  : 'border-slate-200 text-slate-700 bg-slate-50/80 hover:bg-slate-100 hover:text-slate-900'
              )}
              title="Toggle comprehensive BDJobs filters"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  className={cn(
                    'size-4.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                    isFilterPanelOpen || activeFiltersCount > 0
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-900 text-white'
                  )}
                >
                  {activeFiltersCount}
                </span>
              )}
              {isFilterPanelOpen ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs inline-flex items-center gap-1 cursor-pointer"
                title="Reset search and filters"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-9 px-4.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              <span>Search</span>
            </Button>
          </div>
        </form>

        {/* Collapsible Comprehensive Filter Drawer (All BDJobs Filtering Options) */}
        {isFilterPanelOpen && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-slate-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Comprehensive BDJobs Filters
                </h4>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="size-6 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close filters"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Category */}
              <div className="space-y-1.5">
                <label htmlFor="filter-category" className="text-xs font-medium text-slate-700">
                  Functional Category
                </label>
                <select
                  id="filter-category"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Region / Division */}
              <div className="space-y-1.5">
                <label htmlFor="filter-division" className="text-xs font-medium text-slate-700">
                  Region / Division
                </label>
                <select
                  id="filter-division"
                  value={activeLocation}
                  onChange={(e) => {
                    const val = e.target.value
                    setActiveLocation(val)
                    setLocationInput(val)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_DIVISIONS.map((div) => (
                    <option key={div.label} value={div.value}>
                      {div.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Experience Requirement */}
              <div className="space-y-1.5">
                <label htmlFor="filter-experience" className="text-xs font-medium text-slate-700">
                  Experience Level
                </label>
                <select
                  id="filter-experience"
                  value={selectedExperience}
                  onChange={(e) => {
                    setSelectedExperience(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_EXPERIENCES.map((exp) => (
                    <option key={exp.label} value={exp.value}>
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Work Arrangement */}
              <div className="space-y-1.5">
                <label htmlFor="filter-workplace" className="text-xs font-medium text-slate-700">
                  Work Arrangement
                </label>
                <select
                  id="filter-workplace"
                  value={selectedWorkplace}
                  onChange={(e) => {
                    setSelectedWorkplace(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_WORKPLACES.map((wp) => (
                    <option key={wp.label} value={wp.value}>
                      {wp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Employment Type */}
              <div className="space-y-1.5">
                <label htmlFor="filter-emp-type" className="text-xs font-medium text-slate-700">
                  Employment Type
                </label>
                <select
                  id="filter-emp-type"
                  value={selectedEmploymentType}
                  onChange={(e) => {
                    setSelectedEmploymentType(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_EMPLOYMENT_TYPES.map((et) => (
                    <option key={et.label} value={et.value}>
                      {et.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Salary Preference */}
              <div className="space-y-1.5">
                <label htmlFor="filter-salary" className="text-xs font-medium text-slate-700">
                  Salary Option
                </label>
                <select
                  id="filter-salary"
                  value={selectedSalary}
                  onChange={(e) => {
                    setSelectedSalary(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_SALARY_OPTIONS.map((sal) => (
                    <option key={sal.label} value={sal.value}>
                      {sal.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Date Posted */}
              <div className="space-y-1.5">
                <label htmlFor="filter-posted" className="text-xs font-medium text-slate-700">
                  Posted Within
                </label>
                <select
                  id="filter-posted"
                  value={selectedPostedWithin}
                  onChange={(e) => {
                    setSelectedPostedWithin(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_POSTED_OPTIONS.map((po) => (
                    <option key={po.label} value={po.value}>
                      {po.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. Sort Order */}
              <div className="space-y-1.5">
                <label htmlFor="filter-sort" className="text-xs font-medium text-slate-700">
                  Sort Listings By
                </label>
                <select
                  id="filter-sort"
                  value={selectedSortBy}
                  onChange={(e) => {
                    setSelectedSortBy(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer"
                >
                  {BDJOBS_SORT_OPTIONS.map((so) => (
                    <option key={so.label} value={so.value}>
                      {so.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filter Strip & Result Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-medium mr-0.5">Quick:</span>
            {BDJOBS_EMPLOYMENT_TYPES.map((type) => {
              const isSelected = selectedEmploymentType === type.value
              return (
                <button
                  key={type.label}
                  type="button"
                  onClick={() => {
                    setSelectedEmploymentType(type.value)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {type.label}
                </button>
              )
            })}

            <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1" />

            {/* Workplace Quick Chips */}
            {['remote', 'onsite'].map((wpVal) => {
              const isSelected = selectedWorkplace === wpVal
              const label = wpVal === 'remote' ? 'Remote Only' : 'On-site Only'
              return (
                <button
                  key={wpVal}
                  type="button"
                  onClick={() => {
                    setSelectedWorkplace(isSelected ? '' : wpVal)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-xs">
            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="size-3 text-slate-400" />
              <select
                aria-label="Sort listings by"
                value={selectedSortBy}
                onChange={(e) => {
                  setSelectedSortBy(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-7 text-xs bg-transparent border-0 text-slate-600 hover:text-slate-900 font-medium outline-none cursor-pointer pr-1"
              >
                {BDJOBS_SORT_OPTIONS.map((so) => (
                  <option key={so.label} value={so.value}>
                    {so.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-200">|</span>

            <div>
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Loader2 className="size-3 animate-spin" /> Searching...
                </span>
              ) : totalResults > 0 ? (
                <span>
                  Found <strong className="text-slate-800 font-semibold">{totalResults}</strong> jobs
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Active Filter Dismissible Pills Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Active filters:</span>

            {activeLocation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                <MapPin className="size-3 text-slate-500" />
                {activeLocation}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('location')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                Category: {BDJOBS_CATEGORIES.find((c) => c.value === selectedCategory)?.label || selectedCategory}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('category')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedEmploymentType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                {selectedEmploymentType}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('employmentType')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedExperience && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                Exp: {BDJOBS_EXPERIENCES.find((e) => e.value === selectedExperience)?.label || selectedExperience}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('experience')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedWorkplace && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                {BDJOBS_WORKPLACES.find((w) => w.value === selectedWorkplace)?.label || selectedWorkplace}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('workplace')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedSalary && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                {selectedSalary === 'disclosed' ? 'Disclosed Salary' : 'Negotiable'}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('salary')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedPostedWithin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                Posted: {BDJOBS_POSTED_OPTIONS.find((p) => p.value === selectedPostedWithin)?.label}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('postedWithin')}
                  className="hover:text-slate-950 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 3. Fallback / Unreachable Warning Card */}
      {(!isProviderAvailable || error) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 text-amber-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="font-semibold text-xs sm:text-sm text-amber-950">
                  {error || 'BDJobs live search is currently unreachable'}
                </h3>
                <p className="text-xs text-amber-800/90 leading-relaxed max-w-xl">
                  Live results couldn&apos;t be fetched right now. You can open BDJobs directly with your
                  query carried over.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                className="h-8 text-xs border-amber-300 hover:bg-white text-amber-900 cursor-pointer"
              >
                Retry
              </Button>
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-xs font-medium transition-colors shadow-2xs"
              >
                <span>Search on BDJobs</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4. Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-4.5 w-4/5" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8.5 flex-1 rounded-xl" />
                <Skeleton className="h-8.5 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Empty State */}
      {!isLoading && isProviderAvailable && !error && jobs.length === 0 && (
        <Card className="border border-dashed border-slate-300 bg-white shadow-none rounded-2xl">
          <CardContent className="py-12 px-4 text-center max-w-sm mx-auto space-y-3">
            <div className="size-11 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
              <Search className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">No job listings found</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeQuery || activeLocation
                  ? `No matches for "${[activeQuery, activeLocation].filter(Boolean).join(', ')}". Try a broader keyword.`
                  : 'Search for job titles like "React", "Frontend", or "Node.js".'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs cursor-pointer"
                >
                  Clear filters
                </Button>
              )}
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs"
              >
                <span>Search BDJobs</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Beautiful Minimal Job Cards Grid */}
      {!isLoading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const isSaved = isJobAlreadySaved(job)
            const isSaving = savingJobId === job.id
            const avatarTheme = getCompanyAvatarTheme(job.company)
            const initials = getCompanyInitials(job.company)

            return (
              <div
                key={job.id}
                className={`group relative rounded-2xl border bg-white p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  isSaved
                    ? 'border-emerald-200/90 bg-emerald-50/15'
                    : 'border-slate-200/85 hover:border-slate-300'
                }`}
              >
                {/* Card Top: Avatar, Company, Title & Status */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Company Avatar with clean initials */}
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 transition-transform group-hover:scale-105 ${avatarTheme}`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold text-slate-500 truncate"
                          title={job.company}
                        >
                          {job.company}
                        </p>
                        <h3
                          className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5 group-hover:text-slate-800 transition-colors"
                          title={job.title}
                        >
                          {job.title}
                        </h3>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    {isSaved ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <Check className="size-3 text-emerald-600" />
                        Tracked
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-full">
                        BDJobs
                      </span>
                    )}
                  </div>

                  {/* Metadata Pills: Location, Employment Type, Experience */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {job.location && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full truncate max-w-[180px]"
                        title={job.location}
                      >
                        <MapPin className="size-3 text-slate-400 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </span>
                    )}

                    {job.employmentType && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full">
                        <Briefcase className="size-3 text-slate-400 shrink-0" />
                        <span>{job.employmentType}</span>
                      </span>
                    )}

                    {job.experience && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full truncate max-w-[160px]"
                        title={job.experience}
                      >
                        <Clock className="size-3 text-slate-400 shrink-0" />
                        <span className="truncate">{job.experience}</span>
                      </span>
                    )}
                  </div>

                  {/* Salary & Deadlines Row */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1 text-slate-800 font-semibold truncate">
                      <DollarSign className="size-3.5 text-slate-400 shrink-0 -mr-0.5" />
                      <span className="truncate text-xs">
                        {job.salary || 'Negotiable'}
                      </span>
                    </div>

                    {job.deadline && (
                      <span
                        className="shrink-0 text-[11px] font-medium text-rose-600 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded-full"
                        title={`Application deadline: ${job.deadline}`}
                      >
                        Due {job.deadline}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                  {/* Apply on BDJobs Link */}
                  <a
                    href={job.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold transition-colors shadow-2xs select-none"
                  >
                    <span>Apply on BDJobs</span>
                    <ExternalLink className="size-3 text-white/80" />
                  </a>

                  {/* Save to ApplyFlow Button */}
                  <button
                    type="button"
                    disabled={isSaved || isSaving}
                    onClick={() => handleSaveToApplyFlow(job)}
                    className={`h-8.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                      isSaved
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:bg-slate-100'
                    }`}
                    title={isSaved ? 'Already saved in your tracker' : 'Save to your ApplyFlow tracker'}
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin text-slate-600" />
                    ) : isSaved ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="size-3.5 text-slate-400" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 7. Pagination */}
      {!isLoading && jobs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 px-1 text-xs">
          <span className="text-slate-500">
            Page <strong className="font-semibold text-slate-800">{currentPage}</strong> of{' '}
            <strong className="font-semibold text-slate-800">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const prev = Math.max(1, currentPage - 1)
                setCurrentPage(prev)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="h-8 px-2.5 text-xs gap-1 rounded-lg border-slate-200 cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Prev</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => {
                const next = currentPage + 1
                setCurrentPage(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="h-8 px-2.5 text-xs gap-1 rounded-lg border-slate-200 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 8. Minimal Attribution Note */}
      <div className="pt-2 text-center">
        <p className="text-[11px] text-slate-400">
          Job data provided via BDJobs search. Outbound links navigate directly to official BDJobs job postings.
        </p>
      </div>
    </div>
  )
}
