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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import type { DiscoveredJob, JobSearchResponse } from '@/types/job'
import type { JobApplication, WorkplaceType, EmploymentType } from '@/types/dashboard'
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog'
import { toast } from 'sonner'

interface JobDiscoveryPageProps {
  existingApplications: JobApplication[]
  onSaveJob: (appData: Omit<JobApplication, 'id'>) => Promise<JobApplication>
  onNavigateToApplications?: () => void
}

const BDJOBS_CATEGORIES = [
  { label: 'Category: All', value: '' },
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
  { label: 'Region: All Bangladesh', value: '' },
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
  { label: 'Job Type: All', value: '' },
  { label: 'Full Time', value: 'Full Time' },
  { label: 'Part Time', value: 'Part Time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Internship', value: 'Internship' },
]

const BDJOBS_EXPERIENCES = [
  { label: 'Experience: All', value: '' },
  { label: 'Entry Level', value: 'freshers' },
  { label: '1 - 3 Years', value: '1-3' },
  { label: '3 - 5 Years', value: '3-5' },
  { label: '5+ Years (Senior)', value: '5plus' },
]

const BDJOBS_WORKPLACES = [
  { label: 'Workplace: All', value: '' },
  { label: 'On-site', value: 'onsite' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' },
]

const BDJOBS_SALARY_OPTIONS = [
  { label: 'Salary: All', value: '' },
  { label: 'Disclosed Salary Only', value: 'disclosed' },
  { label: 'Negotiable Only', value: 'negotiable' },
]

const BDJOBS_POSTED_OPTIONS = [
  { label: 'Posted: Any Time', value: '' },
  { label: 'Past 24 Hours', value: '24h' },
  { label: 'Past 3 Days', value: '3d' },
  { label: 'Past 7 Days', value: '7d' },
  { label: 'Past 30 Days', value: '30d' },
]

const BDJOBS_SORT_OPTIONS = [
  { label: 'Sort: Relevant', value: 'relevant' },
  { label: 'Sort: Newly Published', value: 'newest' },
  { label: 'Sort: Deadline Closing', value: 'deadline' },
]

interface FilterDropdownProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  title?: string
}

function FilterDropdown({ id, value, onChange, options, title }: FilterDropdownProps) {
  const isSelected = Boolean(value) && value !== 'relevant'
  return (
    <div className="relative inline-flex items-center shrink-0" title={title}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 pl-3 pr-7 rounded-xl text-xs font-medium border appearance-none cursor-pointer transition-all outline-none',
          isSelected
            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
            : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
        )}
      >
        {options.map((opt) => (
          <option
            key={opt.label}
            value={opt.value}
            className="bg-white text-slate-800 font-normal"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          'size-3 absolute right-2 pointer-events-none transition-colors',
          isSelected ? 'text-white/80' : 'text-slate-400'
        )}
      />
    </div>
  )
}

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

function isTkCurrency(salary?: string | null): boolean {
  if (!salary) return false
  return /tk|bdt|৳|taka/i.test(salary)
}

function formatSalary(salary?: string | null): string {
  if (!salary) return 'Tk. --'
  const trimmed = salary.trim()
  if (
    !trimmed ||
    trimmed === '--' ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'not mentioned' ||
    trimmed.toLowerCase() === 'undisclosed'
  ) {
    return 'Tk. --'
  }
  return trimmed
}

function shouldShowDollarSign(salary?: string | null): boolean {
  if (!salary) return false
  const trimmed = salary.trim().toLowerCase()
  if (isTkCurrency(trimmed) || trimmed.startsWith('tk')) return false
  if (trimmed === 'negotiable' || trimmed === 'not mentioned' || trimmed === 'undisclosed' || trimmed === '--') return false
  if (trimmed.includes('$')) return false
  return /usd/i.test(trimmed)
}

/**
 * Format raw deadline dates (e.g. ISO 2026-10-31T00:00:00Z or 2026-10-31) into clean, human-friendly dates (e.g. Oct 31, 2026).
 */
function formatDeadline(val?: string | null): string {
  if (!val || typeof val !== 'string') return ''
  const cleaned = val
    .replace(/^(due|deadline|application deadline|closing)[:\s]*/i, '')
    .trim()
  if (!cleaned) return ''

  // 1. ISO or YYYY-MM-DD / YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
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
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
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

  // 3. Fallback to native Date parser (e.g. "31 Oct 2026", "October 31, 2026")
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return cleaned
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
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [searchResponse, setSearchResponse] = useState<JobSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<DiscoveredJob | null>(null)
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

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (activeLocation) count++
    if (selectedEmploymentType) count++
    if (selectedCategory) count++
    if (selectedExperience) count++
    if (selectedWorkplace) count++
    if (selectedSalary) count++
    if (selectedPostedWithin) count++
    if (selectedSortBy && selectedSortBy !== 'relevant') count++
    return count
  }, [
    activeLocation,
    selectedEmploymentType,
    selectedCategory,
    selectedExperience,
    selectedWorkplace,
    selectedSalary,
    selectedPostedWithin,
    selectedSortBy,
  ])

  const handleSaveToApplyFlow = async (job: DiscoveredJob) => {
    if (isJobAlreadySaved(job)) {
      toast.info('Already saved', {
        description: `"${job.title}" at ${job.company} is already in your saved jobs.`,
        action: onNavigateToApplications
          ? {
              label: 'View in Saved',
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
      salary: formatSalary(job.salary),
      appliedDate: new Date().toISOString().slice(0, 10),
      status: 'Saved',
      notes: [
        job.deadline ? `Deadline: ${formatDeadline(job.deadline)}` : null,
        job.experience ? `Required Experience: ${job.experience}` : null,
      ]
        .filter(Boolean)
        .join(' • ') || undefined,
    }

    try {
      await onSaveJob(applicationPayload)
      toast.success('Saved to ApplyFlow!', {
        description: `"${job.title}" added to your saved jobs.`,
        action: onNavigateToApplications
          ? {
              label: 'View in Saved',
              onClick: onNavigateToApplications,
            }
          : undefined,
      })
    } catch (err) {
      const isConflict =
        (err instanceof ApiError && err.status === 409) ||
        (err instanceof Error && err.message.toLowerCase().includes('already saved'))
      if (isConflict) {
        toast.info('Already saved', {
          description: `"${job.title}" is already in your saved jobs.`,
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
            {/* Filter Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                'h-9 px-3 rounded-xl border text-xs gap-1.5 cursor-pointer transition-colors',
                showFilters || activeFiltersCount > 0
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="size-4.5 rounded-full bg-slate-900 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

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

        {/* Collapsible Dropdown Filters Panel */}
        {showFilters && (
          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-slate-500" />
                <span>Filter Listings</span>
                {activeFiltersCount > 0 && (
                  <span className="text-[11px] font-normal text-slate-500">
                    ({activeFiltersCount} active)
                  </span>
                )}
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset all filters</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* 1. Category */}
              <FilterDropdown
                id="filter-dropdown-category"
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_CATEGORIES}
                title="Filter by functional category"
              />

              {/* 2. Experience Level */}
              <FilterDropdown
                id="filter-dropdown-experience"
                value={selectedExperience}
                onChange={(val) => {
                  setSelectedExperience(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_EXPERIENCES}
                title="Filter by experience level"
              />

              {/* 3. Job Type */}
              <FilterDropdown
                id="filter-dropdown-employment-type"
                value={selectedEmploymentType}
                onChange={(val) => {
                  setSelectedEmploymentType(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_EMPLOYMENT_TYPES}
                title="Filter by employment type"
              />

              {/* 4. Workplace Arrangement */}
              <FilterDropdown
                id="filter-dropdown-workplace"
                value={selectedWorkplace}
                onChange={(val) => {
                  setSelectedWorkplace(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_WORKPLACES}
                title="Filter by workplace arrangement"
              />

              {/* 5. Region / Division */}
              <FilterDropdown
                id="filter-dropdown-division"
                value={activeLocation}
                onChange={(val) => {
                  setActiveLocation(val)
                  setLocationInput(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_DIVISIONS}
                title="Filter by region or division"
              />

              {/* 6. Salary Option */}
              <FilterDropdown
                id="filter-dropdown-salary"
                value={selectedSalary}
                onChange={(val) => {
                  setSelectedSalary(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_SALARY_OPTIONS}
                title="Filter by salary specification"
              />

              {/* 7. Date Posted */}
              <FilterDropdown
                id="filter-dropdown-posted"
                value={selectedPostedWithin}
                onChange={(val) => {
                  setSelectedPostedWithin(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_POSTED_OPTIONS}
                title="Filter by date posted"
              />

              {/* 8. Sort Order */}
              <FilterDropdown
                id="filter-dropdown-sort"
                value={selectedSortBy}
                onChange={(val) => {
                  setSelectedSortBy(val)
                  setCurrentPage(1)
                }}
                options={BDJOBS_SORT_OPTIONS}
                title="Sort job listings"
              />
            </div>
          </div>
        )}

        {/* Results Count & Status Summary Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-0.5">
          <div>
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Loader2 className="size-3 animate-spin" /> Searching jobs...
              </span>
            ) : totalResults > 0 ? (
              <span>
                Found <strong className="text-slate-800 font-semibold">{totalResults}</strong> jobs
                {activeFiltersCount > 0 && !showFilters && (
                  <span className="text-slate-400 ml-1.5">
                    ({activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied)
                  </span>
                )}
              </span>
            ) : null}
          </div>

          {activeFiltersCount > 0 && !showFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
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
            const isInternRole = job.title.toLowerCase().includes('intern')
            const isEntryLevel =
              isInternRole ||
              !job.experience ||
              job.experience === '--' ||
              job.experience.toLowerCase().includes('entry') ||
              job.experience.toLowerCase().includes('fresh') ||
              job.experience.toLowerCase().includes('intern')
            const displayExperience = !isEntryLevel ? job.experience : null

            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedJobForDetail(job)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedJobForDetail(job)
                  }
                }}
                className={`group relative rounded-2xl border bg-white p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
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

                    {/* Source Pill Badge */}
                    <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-full">
                      BDJobs
                    </span>
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

                    {displayExperience && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full truncate max-w-[160px]"
                        title={displayExperience}
                      >
                        <Clock className="size-3 shrink-0 text-slate-400" />
                        <span className="truncate">{displayExperience}</span>
                      </span>
                    )}
                  </div>

                  {/* Salary & Deadlines Row */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1 text-slate-800 font-semibold truncate">
                      {shouldShowDollarSign(formatSalary(job.salary)) && (
                        <DollarSign className="size-3.5 text-slate-400 shrink-0 -mr-0.5" />
                      )}
                      <span className="truncate text-xs">
                        {formatSalary(job.salary)}
                      </span>
                    </div>

                    {formatDeadline(job.deadline) && (
                      <span
                        className="shrink-0 text-[11px] font-medium text-rose-600 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        title={`Application deadline: ${formatDeadline(job.deadline)}`}
                      >
                        <Calendar className="size-3 text-rose-500 shrink-0" />
                        <span>Due {formatDeadline(job.deadline)}</span>
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
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold transition-colors shadow-2xs select-none"
                  >
                    <span>Apply on BDJobs</span>
                    <ExternalLink className="size-3 text-white/80" />
                  </a>

                  {/* Save to ApplyFlow Button */}
                  <button
                    type="button"
                    disabled={isSaved || isSaving}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveToApplyFlow(job)
                    }}
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

      {/* 9. Complete BDJobs Detail Dialog */}
      <JobDetailDialog
        job={selectedJobForDetail}
        open={Boolean(selectedJobForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedJobForDetail(null)
        }}
        isSaved={selectedJobForDetail ? isJobAlreadySaved(selectedJobForDetail) : false}
        isSaving={selectedJobForDetail ? savingJobId === selectedJobForDetail.id : false}
        onSaveJob={handleSaveToApplyFlow}
      />
    </div>
  )
}
