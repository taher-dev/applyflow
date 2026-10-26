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
  Compass,
  AlertCircle,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

const EMPLOYMENT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Full Time', value: 'Full Time' },
  { label: 'Part Time', value: 'Part Time' },
  { label: 'Contract', value: 'Contract' },
  { label: 'Internship', value: 'Internship' },
]

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
  const [currentPage, setCurrentPage] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [searchResponse, setSearchResponse] = useState<JobSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)

  // Track saved jobs set for fast duplicate lookups
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

  // Trigger search on mount and when query/filter values change
  useEffect(() => {
    let cancelled = false

    api.jobs
      .search({
        query: activeQuery,
        location: activeLocation || undefined,
        employmentType: selectedEmploymentType || undefined,
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
              : 'Unable to connect to job search service. Please check your network and try again.'
          setError(message)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeQuery, activeLocation, selectedEmploymentType, currentPage, retryTrigger])

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    setRetryTrigger((prev) => prev + 1)
  }

  // Handle explicit search submission
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setActiveQuery(keywordInput.trim())
    setActiveLocation(locationInput.trim())
    setCurrentPage(1)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setIsLoading(true)
    setKeywordInput('')
    setActiveQuery('')
    setLocationInput('')
    setActiveLocation('')
    setSelectedEmploymentType('')
    setCurrentPage(1)
  }

  // Save discovered job to ApplyFlow
  const handleSaveToApplyFlow = async (job: DiscoveredJob) => {
    if (isJobAlreadySaved(job)) {
      toast.info('Already tracked', {
        description: `"${job.title}" at ${job.company} is already in your application pipeline.`,
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

    // Map discovered job to ApplyFlow JobApplication
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
        description: `"${job.title}" at ${job.company} added as Saved.`,
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
          description: `"${job.title}" is already tracked in your pipeline.`,
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

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Banner & Context */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Compass className="size-3.5" />
              Live Job Discovery
            </span>
            <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs">
              Powered by BDJobs
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Find Your Next Career Move
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Search live job listings across Bangladesh, explore verified company openings,
            and instantly track applications inside ApplyFlow with one click.
          </p>
        </div>
        {/* Subtle decorative glow */}
        <div
          className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* 2. Search & Filter Bar */}
      <Card className="border-slate-200/90 shadow-2xs">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Keyword Search */}
              <div className="sm:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="job-keyword-input"
                  placeholder="Job title, keywords, or company..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus-visible:bg-white"
                />
              </div>

              {/* Location Input */}
              <div className="sm:col-span-4 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="job-location-input"
                  placeholder="Location (e.g. Dhaka, Remote)..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus-visible:bg-white"
                />
              </div>

              {/* Search Action Buttons */}
              <div className="sm:col-span-3 flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer font-medium text-sm gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  <span>Search</span>
                </Button>

                {(keywordInput || locationInput || activeQuery || activeLocation || selectedEmploymentType) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="h-10 px-3 border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Clear filters"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Employment Type Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 mr-1 font-medium flex items-center gap-1">
                <Briefcase className="size-3" /> Type:
              </span>
              {EMPLOYMENT_TYPES.map((type) => {
                const isSelected = selectedEmploymentType === type.value
                return (
                  <button
                    key={type.label}
                    type="button"
                    onClick={() => {
                      setSelectedEmploymentType(type.value)
                      setCurrentPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {type.label}
                  </button>
                )
              })}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Search Summary & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          {!isLoading && totalResults > 0 && (
            <span>
              Found <strong className="text-slate-900 font-semibold">{totalResults}</strong> jobs
              {activeQuery && <> for &ldquo;<span className="text-slate-800">{activeQuery}</span>&rdquo;</>}
              {activeLocation && <> in &ldquo;<span className="text-slate-800">{activeLocation}</span>&rdquo;</>}
            </span>
          )}
          {isLoading && (
            <span className="flex items-center gap-1.5 text-slate-600">
              <Loader2 className="size-3.5 animate-spin text-slate-800" />
              Searching BDJobs for live listings...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Source:</span>
          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            BDJobs Live Feed
          </span>
        </div>
      </div>

      {/* 4. Error / Provider Unavailable Fallback Banner */}
      {(!isProviderAvailable || error) && (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-5 text-amber-900 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-sm text-amber-950">
                  {error || 'Live BDJobs search service is temporarily unreachable'}
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                We couldn&apos;t load live results inside ApplyFlow at this moment. You can directly browse
                the verified search results on BDJobs with your query carried over.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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

      {/* 5. Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="border-slate-200/80 shadow-2xs">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1 rounded-lg" />
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 6. Empty State */}
      {!isLoading && isProviderAvailable && !error && jobs.length === 0 && (
        <Card className="border-dashed border-slate-300 bg-white shadow-none">
          <CardContent className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="size-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
              <Search className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-900 text-base">No job listings found</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeQuery || activeLocation
                  ? `We couldn't find any listings matching "${[activeQuery, activeLocation].filter(Boolean).join(', ')}". Try adjusting keywords or location.`
                  : 'Try typing a job title like "React", "Frontend", or "Python" in the search box above.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-xs cursor-pointer"
              >
                Clear all filters
              </Button>
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs"
              >
                <span>Search directly on BDJobs</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. Job Results Grid */}
      {!isLoading && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const isSaved = isJobAlreadySaved(job)
            const isSaving = savingJobId === job.id

            return (
              <Card
                key={job.id}
                className={`border transition-all duration-200 flex flex-col justify-between ${
                  isSaved
                    ? 'border-indigo-200 bg-indigo-50/20 shadow-2xs'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Card Top: Source badge & Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                        <Sparkles className="size-2.5" />
                        BDJobs
                      </span>

                      {isSaved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                          <Check className="size-3" />
                          Tracked
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        className="font-bold text-slate-900 text-base leading-snug line-clamp-2 hover:text-indigo-600 transition-colors"
                        title={job.title}
                      >
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-medium truncate">
                        <Building2 className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={job.company}>
                          {job.company}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Key Metadata Badges & Details */}
                  <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {job.location && (
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 text-[11px] font-normal gap-1 px-2 py-0.5 max-w-[180px] truncate"
                          title={job.location}
                        >
                          <MapPin className="size-3 text-slate-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </Badge>
                      )}

                      {job.employmentType && (
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 text-[11px] font-normal gap-1 px-2 py-0.5"
                        >
                          <Briefcase className="size-3 text-slate-400 shrink-0" />
                          <span>{job.employmentType}</span>
                        </Badge>
                      )}
                    </div>

                    {/* Salary & Experience */}
                    <div className="space-y-1 text-slate-700 text-xs">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 text-[11px]">Salary:</span>
                        <span className="font-medium text-slate-900 truncate">
                          {job.salary || 'Negotiable / Not provided'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 text-[11px]">Experience:</span>
                        <span className="font-medium text-slate-900 truncate">
                          {job.experience || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    {/* Published & Deadline dates */}
                    {(job.publishedAt || job.deadline) && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        {job.publishedAt ? (
                          <span title={`Published: ${job.publishedAt}`}>
                            Posted: {job.publishedAt}
                          </span>
                        ) : (
                          <span />
                        )}
                        {job.deadline && (
                          <span
                            className="font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded"
                            title={`Deadline: ${job.deadline}`}
                          >
                            Deadline: {job.deadline}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {/* Apply on BDJobs */}
                    <a
                      href={job.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer select-none"
                    >
                      <span>Apply on BDJobs</span>
                      <ExternalLink className="size-3" />
                    </a>

                    {/* Save to ApplyFlow */}
                    <Button
                      type="button"
                      variant={isSaved ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={isSaved || isSaving}
                      onClick={() => handleSaveToApplyFlow(job)}
                      className={`h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                      title={isSaved ? 'Saved in your ApplyFlow tracker' : 'Save to your ApplyFlow tracker'}
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
                          <Bookmark className="size-3.5 text-slate-500" />
                          <span>Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 8. Pagination Controls */}
      {!isLoading && jobs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 px-1">
          <div className="text-xs text-slate-500">
            Showing page <strong className="font-semibold text-slate-800">{currentPage}</strong> of{' '}
            <strong className="font-semibold text-slate-800">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const prev = Math.max(1, currentPage - 1)
                setCurrentPage(prev)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="h-8 px-2.5 text-xs gap-1 border-slate-200 cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
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
              className="h-8 px-2.5 text-xs gap-1 border-slate-200 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 9. Data Attribution & Compliance Footer Note */}
      <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-4 text-[11px] text-slate-500 leading-relaxed space-y-1">
        <p className="font-medium text-slate-700">Data attribution & job listings note:</p>
        <p>
          Job listings and descriptions are provided directly by BDJobs public search services.
          ApplyFlow does not claim ownership of external job data. Outbound links connect directly to
          canonical BDJobs job listings for application processing and company verification.
        </p>
      </div>
    </div>
  )
}
