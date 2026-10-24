import { useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  Video,
  User,
  Plus,
  Search,
  X,
  RotateCcw,
  Pencil,
  Trash2,
  FileText,
  ExternalLink,
  CalendarCheck,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { Interview, JobApplication } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import { InterviewDetailsDialog } from './InterviewDetailsDialog'

interface InterviewsPageProps {
  interviews: Interview[]
  applications: JobApplication[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onScheduleInterview: (preselectedAppId?: string) => void
  onEditInterview: (interview: Interview) => void
  onDeleteInterview: (interview: Interview) => void
  onNavigateToApplications?: () => void
}



// Relative date helper (e.g. "Tomorrow", "In 2 days", "3 days ago")
function getRelativeDateLabel(scheduledAt: string, currentTimestamp: number) {
  const target = new Date(scheduledAt).getTime()
  if (isNaN(target)) return ''

  const diffMs = target - currentTimestamp
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (diffHours > 0) return `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`
    if (diffHours < 0) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ago`
    return 'Today'
  }
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1) return `In ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

export function InterviewsPage({
  interviews,
  applications,
  isLoading,
  error,
  onRetry,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onScheduleInterview,
  onEditInterview,
  onDeleteInterview,
  onNavigateToApplications,
}: InterviewsPageProps) {
  const [currentTime] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [selectedInterviewForDetails, setSelectedInterviewForDetails] = useState<Interview | null>(null)
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery

  const handleSearchChange = (val: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val)
    } else {
      setInternalSearchQuery(val)
    }
  }

  // Map applicationId -> JobApplication for fast, safe resolution
  const applicationMap = useMemo(() => {
    const map = new Map<string, JobApplication>()
    for (const app of applications) {
      map.set(app.id, app)
    }
    return map
  }, [applications])

  // Filter interviews by search query
  const filteredInterviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return interviews.filter((interview) => {
      const app = applicationMap.get(interview.applicationId)

      // Search matching company, role, interviewer, or notes
      if (query) {
        const companyMatch = app?.company.toLowerCase().includes(query) ?? false
        const roleMatch = app?.role.toLowerCase().includes(query) ?? false
        const interviewerMatch = interview.interviewer?.toLowerCase().includes(query) ?? false
        const notesMatch = interview.notes?.toLowerCase().includes(query) ?? false

        if (!companyMatch && !roleMatch && !interviewerMatch && !notesMatch) {
          return false
        }
      }

      return true
    })
  }, [interviews, searchQuery, applicationMap])

  // Split into Upcoming (future) and Past (historical) using exact timestamps
  const { upcomingInterviews, pastInterviews } = useMemo(() => {
    const upcoming: Interview[] = []
    const past: Interview[] = []

    for (const item of filteredInterviews) {
      const time = new Date(item.scheduledAt).getTime()
      if (time >= currentTime) {
        upcoming.push(item)
      } else {
        past.push(item)
      }
    }

    // Sort upcoming chronologically: soonest first (ascending timestamp)
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    // Sort past chronologically: most recent first (descending timestamp)
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

    return { upcomingInterviews: upcoming, pastInterviews: past }
  }, [filteredInterviews, currentTime])

  const totalUpcomingCount = useMemo(() => {
    return interviews.filter((i) => new Date(i.scheduledAt).getTime() >= currentTime).length
  }, [interviews, currentTime])

  const totalPastCount = useMemo(() => {
    return interviews.filter((i) => new Date(i.scheduledAt).getTime() < currentTime).length
  }, [interviews, currentTime])

  const activeList = activeTab === 'upcoming' ? upcomingInterviews : pastInterviews
  const hasActiveFilters = searchQuery.trim().length > 0

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Warning banner when no applications exist */}
      {applications.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>You have no tracked job applications yet. Add an application first before scheduling interviews.</span>
          </div>
          {onNavigateToApplications && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToApplications}
              className="h-7 text-xs shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40 cursor-pointer"
            >
              View applications
            </Button>
          )}
        </div>
      )}

      {/* 2. Top Metric Cards for Interviews - 2 columns on small screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Scheduled */}
        <Card className="border border-slate-200/80 bg-white shadow-xs rounded-xl">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Total Scheduled</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{interviews.length}</div>
              <p className="text-[11px] text-slate-400">Across all applications</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 shrink-0">
              <Calendar className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Rounds */}
        <Card className="border border-slate-200/80 bg-white shadow-xs rounded-xl">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Upcoming Rounds</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {totalUpcomingCount}
              </div>
              <p className="text-[11px] text-slate-400">Require your preparation</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 shrink-0">
              <CalendarClock className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed / Past Rounds */}
        <Card className="border border-slate-200/80 bg-white shadow-xs col-span-2 sm:col-span-1 rounded-xl">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Completed Rounds</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalPastCount}</div>
              <p className="text-[11px] text-slate-400">Historical milestones</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 shrink-0">
              <CalendarCheck className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter & Tab Controls */}
      <Card id="interviews-list-container" className="border border-slate-200/80 bg-white shadow-xs scroll-mt-20 rounded-xl">
        <CardHeader className="border-b border-slate-200/80 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Switcher: Upcoming vs Past */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  activeTab === 'upcoming'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <CalendarClock className="size-3.5" />
                <span>Upcoming Interviews</span>
                <Badge
                  variant={activeTab === 'upcoming' ? 'default' : 'secondary'}
                  className={cn(
                    'size-5 p-0 text-[10px] flex items-center justify-center rounded-full',
                    activeTab === 'upcoming'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {upcomingInterviews.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  activeTab === 'past'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <CalendarCheck className="size-3.5" />
                <span>Past Interviews</span>
                <Badge
                  variant={activeTab === 'past' ? 'default' : 'secondary'}
                  className={cn(
                    'size-5 p-0 text-[10px] flex items-center justify-center rounded-full',
                    activeTab === 'past'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {pastInterviews.length}
                </Badge>
              </button>
            </div>

            {/* Quick search input */}
            <div className="flex items-center gap-2 flex-1 lg:max-w-md xl:max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                <Input
                  id="interviews-search-input"
                  type="text"
                  placeholder="Search by company, role, interviewer..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-8 h-8.5 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSearchChange('')}
                  className="size-8.5 shrink-0 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* 4. Interviews Card Grid Content */}
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-2.5">
              <div className="size-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading interviews...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-xs font-semibold text-rose-600">{error}</div>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-xs gap-1.5 cursor-pointer mx-auto"
                >
                  <RotateCcw className="size-3" />
                  <span>Try again</span>
                </Button>
              )}
            </div>
          ) : activeList.length === 0 ? (
            /* Empty States */
            <div className="py-12 sm:py-16 text-center space-y-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto text-muted-foreground">
                {activeTab === 'upcoming' ? (
                  <CalendarClock className="size-6" />
                ) : (
                  <CalendarCheck className="size-6" />
                )}
              </div>

              {hasActiveFilters ? (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    No matching interviews found
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No {activeTab} interviews match your search. Try adjusting your search terms or clearing the search.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearchChange('')}
                    className="mt-2 text-xs gap-1.5"
                  >
                    <RotateCcw className="size-3" />
                    <span>Clear search</span>
                  </Button>
                </div>
              ) : activeTab === 'upcoming' ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    No upcoming interviews scheduled
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    You have no scheduled interview rounds on your calendar. When a recruiter or
                    engineering team invites you to an interview, schedule it here to keep your
                    preparation on track.
                  </p>
                  <Button
                    onClick={() => onScheduleInterview()}
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 mt-2 cursor-pointer shadow-xs rounded-lg"
                  >
                    <Plus className="size-3.5" />
                    <span>Schedule an interview</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">No past interviews yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Interviews you complete will automatically appear here once their scheduled date
                    and time has passed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Clean, Structured Interview Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {activeList.map((interview) => {
                const app = applicationMap.get(interview.applicationId)
                const interviewDate = new Date(interview.scheduledAt)
                const isValidDate = !isNaN(interviewDate.getTime())

                const formattedDate = isValidDate
                  ? interviewDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : interview.scheduledAt

                const formattedTime = isValidDate
                  ? interviewDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : ''

                const relativeLabel = getRelativeDateLabel(interview.scheduledAt, currentTime)
                const isUpcoming = activeTab === 'upcoming'

                return (
                  <div
                    key={interview.id}
                    onClick={() => setSelectedInterviewForDetails(interview)}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4 hover:shadow-xs transition-shadow space-y-3 sm:space-y-3.5 cursor-pointer"
                  >
                    {/* Top Row: Company Monogram + Title + Actions */}
                    <div className="space-y-2 sm:space-y-2.5">
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                        <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                          {/* Company Avatar Monogram */}
                          <div className="flex size-7.5 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] sm:text-xs border border-slate-200 mt-0.5">
                            {(app?.company || 'AP').slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs sm:text-sm text-slate-900 break-words [overflow-wrap:anywhere] leading-snug">
                              {app?.company || 'Unknown Company'}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-500 break-words [overflow-wrap:anywhere] leading-snug mt-0.5 font-medium">
                              {app?.role || 'Job Opportunity'}
                            </p>
                          </div>
                        </div>

                        {/* Top-Right: Relative Countdown & Action Menu */}
                        <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                          {relativeLabel && (
                            <span
                              className={cn(
                                'text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded border',
                                isUpcoming
                                  ? 'bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              )}
                            >
                              {relativeLabel}
                            </span>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                className="size-6 sm:size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label={`Actions for interview at ${app?.company}`}
                              >
                                <MoreHorizontal className="size-3.5 sm:size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={() => onEditInterview(interview)}
                                className="cursor-pointer text-xs"
                              >
                                <Pencil className="size-3.5 mr-2" />
                                <span>Edit Interview</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteInterview(interview)}
                                className="text-destructive focus:text-destructive cursor-pointer text-xs"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                <span>Delete Interview</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Scheduled Date & Time Card */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2 sm:p-2.5 text-[11px] sm:text-xs text-slate-500 space-y-1 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                        <Calendar className="size-3 sm:size-3.5 text-slate-700 shrink-0" />
                        <span className="truncate">{formattedDate}</span>
                      </div>
                      {formattedTime && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="size-3 sm:size-3.5 text-slate-400 shrink-0" />
                          <span>{formattedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta Info: Interviewer & Location/Link */}
                    {(interview.interviewer || interview.locationOrLink) && (
                      <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                        {interview.interviewer && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate font-medium text-slate-900">
                              {interview.interviewer}
                            </span>
                          </div>
                        )}

                        {interview.locationOrLink && (
                          <div className="flex items-center gap-1.5 truncate">
                            {interview.locationOrLink.startsWith('http') ? (
                              <>
                                <ExternalLink className="size-3 text-slate-700 shrink-0" />
                                <a
                                  href={interview.locationOrLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-slate-900 hover:underline truncate font-medium"
                                >
                                  {interview.locationOrLink}
                                </a>
                              </>
                            ) : (
                              <>
                                <Video className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">{interview.locationOrLink}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preparation Notes (if available) */}
                    {interview.notes && (
                      <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300">
                          <FileText className="size-3" />
                          <span>Preparation Notes</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] line-clamp-2">
                          {interview.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Interview Details Popup Modal */}
      <InterviewDetailsDialog
        interview={selectedInterviewForDetails}
        application={
          selectedInterviewForDetails
            ? applicationMap.get(selectedInterviewForDetails.applicationId)
            : null
        }
        open={Boolean(selectedInterviewForDetails)}
        onOpenChange={(open) => {
          if (!open) setSelectedInterviewForDetails(null)
        }}
        onEdit={(interview) => {
          onEditInterview(interview)
        }}
        onDelete={(interview) => {
          onDeleteInterview(interview)
        }}
      />
    </div>
  )
}
