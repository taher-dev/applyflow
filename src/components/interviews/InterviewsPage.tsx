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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { Interview, JobApplication, InterviewType } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface InterviewsPageProps {
  interviews: Interview[]
  applications: JobApplication[]
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onScheduleInterview: (preselectedAppId?: string) => void
  onEditInterview: (interview: Interview) => void
  onDeleteInterview: (interview: Interview) => void
  onNavigateToApplications?: () => void
}

// Color badges for each interview type
function getInterviewTypeBadgeClass(type: InterviewType) {
  switch (type) {
    case 'Technical interview':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Final interview':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'Phone screening':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Video interview':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
    case 'On-site interview':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
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
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery

  const handleSearchChange = (val: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val)
    } else {
      setInternalSearchQuery(val)
    }
  }

  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  // Map applicationId -> JobApplication for fast, safe resolution
  const applicationMap = useMemo(() => {
    const map = new Map<string, JobApplication>()
    for (const app of applications) {
      map.set(app.id, app)
    }
    return map
  }, [applications])

  // Filter interviews by search query and interview type
  const filteredInterviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return interviews.filter((interview) => {
      const app = applicationMap.get(interview.applicationId)

      // Type filter
      if (typeFilter !== 'ALL' && interview.interviewType !== typeFilter) {
        return false
      }

      // Search matching company, role, interviewer, or notes
      if (query) {
        const companyMatch = app?.company.toLowerCase().includes(query) ?? false
        const roleMatch = app?.role.toLowerCase().includes(query) ?? false
        const interviewerMatch = interview.interviewer?.toLowerCase().includes(query) ?? false
        const notesMatch = interview.notes?.toLowerCase().includes(query) ?? false
        const typeMatch = interview.interviewType.toLowerCase().includes(query)

        if (!companyMatch && !roleMatch && !interviewerMatch && !notesMatch && !typeMatch) {
          return false
        }
      }

      return true
    })
  }, [interviews, searchQuery, typeFilter, applicationMap])

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
  const hasActiveFilters = searchQuery.trim().length > 0 || typeFilter !== 'ALL'

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
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Scheduled</span>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{interviews.length}</div>
              <p className="text-[11px] text-muted-foreground">Across all applications</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
              <Calendar className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Rounds */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Upcoming Rounds</span>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalUpcomingCount}
              </div>
              <p className="text-[11px] text-muted-foreground">Require your preparation</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
              <CalendarClock className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed / Past Rounds */}
        <Card className="border border-border/80 bg-card shadow-2xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Completed Rounds</span>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{totalPastCount}</div>
              <p className="text-[11px] text-muted-foreground">Historical milestones</p>
            </div>
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
              <CalendarCheck className="size-4 sm:size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter & Tab Controls */}
      <Card id="interviews-list-container" className="border border-border/80 bg-card shadow-2xs scroll-mt-20">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Switcher: Upcoming vs Past */}
            <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  activeTab === 'upcoming'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarClock className="size-3.5" />
                <span>Upcoming Interviews</span>
                <Badge
                  variant={activeTab === 'upcoming' ? 'default' : 'secondary'}
                  className="size-5 p-0 text-[10px] flex items-center justify-center rounded-full"
                >
                  {upcomingInterviews.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  activeTab === 'past'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarCheck className="size-3.5" />
                <span>Past Interviews</span>
                <Badge
                  variant={activeTab === 'past' ? 'default' : 'secondary'}
                  className="size-5 p-0 text-[10px] flex items-center justify-center rounded-full"
                >
                  {pastInterviews.length}
                </Badge>
              </button>
            </div>

            {/* Quick search input & type filter */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 lg:max-w-md xl:max-w-lg">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="interviews-search-input"
                  type="text"
                  placeholder="Search by company, role, interviewer..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-8 h-8.5 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Type filter - sized comfortably for 'Technical interview' */}
              <div className="w-full sm:w-[165px] md:w-[175px] shrink-0">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8.5 text-xs bg-background px-2.5">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="Phone screening">Phone screening</SelectItem>
                    <SelectItem value="Video interview">Video interview</SelectItem>
                    <SelectItem value="Technical interview">Technical interview</SelectItem>
                    <SelectItem value="On-site interview">On-site interview</SelectItem>
                    <SelectItem value="Final interview">Final interview</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleSearchChange('')
                    setTypeFilter('ALL')
                  }}
                  className="size-8.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reset filters"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* 4. Interviews Card Grid Content */}
        <CardContent className="p-4 sm:p-6">
          {activeList.length === 0 ? (
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
                    No {activeTab} interviews match your current search and type filters. Try
                    adjusting your search terms or clearing filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleSearchChange('')
                      setTypeFilter('ALL')
                    }}
                    className="mt-2 text-xs gap-1.5"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset filters</span>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 mt-2 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Schedule an interview</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">No past interviews yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Interviews you complete will automatically appear here once their scheduled date
                    and time has passed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Interview Cards List - 2 columns on small screens */
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 sm:p-4 hover:shadow-xs transition-shadow space-y-3 sm:space-y-3.5"
                  >
                    {/* Top Row: Company Monogram + Title + Type Badge + Actions */}
                    <div className="space-y-2 sm:space-y-2.5">
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                        <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                          {/* Company Avatar Monogram */}
                          <div className="flex size-7.5 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] sm:text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300 mt-0.5">
                            {(app?.company || 'AP').slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground break-words [overflow-wrap:anywhere] leading-snug">
                              {app?.company || 'Unknown Company'}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-muted-foreground break-words [overflow-wrap:anywhere] leading-snug mt-0.5 font-medium">
                              {app?.role || 'Job Opportunity'}
                            </p>
                          </div>
                        </div>

                        {/* Top-Right Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 sm:size-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer -mr-1 -mt-1"
                              aria-label={`Actions for interview at ${app?.company}`}
                            >
                              <MoreHorizontal className="size-3.5 sm:size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
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

                      {/* Type Badge & Relative Countdown */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border',
                            getInterviewTypeBadgeClass(interview.interviewType)
                          )}
                        >
                          {interview.interviewType}
                        </span>

                        {relativeLabel && (
                          <span
                            className={cn(
                              'text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded',
                              isUpcoming
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {relativeLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Scheduled Date & Time Card */}
                    <div className="rounded-lg bg-muted/30 border border-border/50 p-2 sm:p-2.5 text-[11px] sm:text-xs text-muted-foreground space-y-1 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Calendar className="size-3 sm:size-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{formattedDate}</span>
                      </div>
                      {formattedTime && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="size-3 sm:size-3.5 text-muted-foreground/70 shrink-0" />
                          <span>{formattedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta Info: Interviewer & Location/Link */}
                    <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-muted-foreground pt-1 border-t border-border/40">
                      {interview.interviewer && (
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="size-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate font-medium text-foreground/90">
                            {interview.interviewer}
                          </span>
                        </div>
                      )}

                      {interview.locationOrLink && (
                        <div className="flex items-center gap-1.5 truncate">
                          {interview.locationOrLink.startsWith('http') ? (
                            <>
                              <ExternalLink className="size-3 text-blue-600 shrink-0" />
                              <a
                                href={interview.locationOrLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                              >
                                {interview.locationOrLink}
                              </a>
                            </>
                          ) : (
                            <>
                              <Video className="size-3 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">{interview.locationOrLink}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preparation Notes (if available) */}
                    {interview.notes && (
                      <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300">
                          <FileText className="size-3" />
                          <span>Preparation Notes</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
                          {interview.notes}
                        </p>
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-end gap-1 pt-1.5 sm:pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditInterview(interview)}
                        className="h-6.5 sm:h-7 px-2 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                      >
                        <Pencil className="size-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteInterview(interview)}
                        className="h-6.5 sm:h-7 px-2 text-[11px] sm:text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
                      >
                        <Trash2 className="size-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
