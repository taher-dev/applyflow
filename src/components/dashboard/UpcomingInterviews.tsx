import { useState, useMemo } from 'react'
import type { Interview, JobApplication } from '@/types/dashboard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  Video,
  User,
  Plus,
  ArrowRight,
  CalendarClock,
  Pencil,
  Trash2,
} from 'lucide-react'

interface UpcomingInterviewsProps {
  interviews: Interview[]
  applications: JobApplication[]
  onScheduleInterview?: () => void
  onEditInterview?: (interview: Interview) => void
  onDeleteInterview?: (interview: Interview) => void
  onViewAllInterviews?: () => void
}

export function UpcomingInterviews({
  interviews,
  applications,
  onScheduleInterview,
  onEditInterview,
  onDeleteInterview,
  onViewAllInterviews,
}: UpcomingInterviewsProps) {
  const [currentTime] = useState(() => Date.now())

  // Map applicationId -> JobApplication for fast resolution
  const applicationMap = useMemo(() => {
    const map = new Map<string, JobApplication>()
    for (const app of applications) {
      map.set(app.id, app)
    }
    return map
  }, [applications])

  // Filter for upcoming/future interviews only, sorted chronologically (soonest first)
  const upcomingInterviews = useMemo(() => {
    return interviews
      .filter((interview) => {
        const time = new Date(interview.scheduledAt).getTime()
        return !isNaN(time) && time >= currentTime
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [interviews, currentTime])

  // Top 3 for dashboard overview
  const displayedInterviews = upcomingInterviews.slice(0, 3)

  return (
    <Card className="border border-slate-200/80 bg-white shadow-xs flex flex-col rounded-xl">
      <CardHeader className="border-b border-slate-200/80 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Upcoming Interviews
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Scheduled conversations & interview rounds
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Badge variant="outline" className="text-xs border-slate-200 bg-slate-50 text-slate-700">
              {upcomingInterviews.length} upcoming
            </Badge>

            {onScheduleInterview && (
              <Button
                size="sm"
                variant="outline"
                onClick={onScheduleInterview}
                className="h-7 text-xs gap-1 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="size-3" />
                <span>Schedule</span>
              </Button>
            )}

            {onViewAllInterviews && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onViewAllInterviews}
                className="h-7 text-xs text-slate-900 hover:text-slate-700 cursor-pointer gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 flex-1">
        {displayedInterviews.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-500">
              <CalendarClock className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900">No upcoming interviews</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                You have no interviews scheduled. Click Schedule to add a recruiter screen,
                technical assessment, or final round.
              </p>
            </div>
            {onScheduleInterview && (
              <Button
                size="sm"
                onClick={onScheduleInterview}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 mt-1 cursor-pointer shadow-xs rounded-lg"
              >
                <Plus className="size-3.5" />
                <span>Schedule an interview</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {displayedInterviews.map((interview) => {
              const app = applicationMap.get(interview.applicationId)
              const interviewDate = new Date(interview.scheduledAt)
              const isValidDate = !isNaN(interviewDate.getTime())

              const formattedDate = isValidDate
                ? interviewDate.toLocaleDateString('en-US', {
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

              return (
                <div
                  key={interview.id}
                  className="rounded-xl border border-slate-200/80 p-3 sm:p-3.5 bg-slate-50/60 hover:bg-slate-100/50 transition-colors space-y-2 sm:space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header: Company & Interview Type */}
                    <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight truncate"
                          title={app?.company || 'Company'}
                        >
                          {app?.company || 'Opportunity'}
                        </h4>
                        <p
                          className="text-[11px] sm:text-xs text-slate-500 truncate"
                          title={app?.role || 'Position'}
                        >
                          {app?.role || 'Interview Round'}
                        </p>
                      </div>

                      <span className="inline-flex items-center text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                        {interview.interviewType}
                      </span>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="size-3 sm:size-3.5 text-slate-700 shrink-0" />
                        <span className="font-medium text-slate-900 truncate">
                          {formattedDate}
                        </span>
                      </div>
                      {formattedTime && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="size-3 sm:size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formattedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Interviewer & Platform */}
                    {(interview.interviewer || interview.locationOrLink) && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {interview.interviewer || 'Interview Team'}
                          </span>
                        </div>
                        {interview.locationOrLink && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium shrink-0">
                            <Video className="size-3" />
                            <span className="truncate max-w-[100px]">
                              {interview.locationOrLink}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Card Edit/Delete Action Controls */}
                  {(onEditInterview || onDeleteInterview) && (
                    <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-border/40">
                      {onEditInterview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditInterview(interview)}
                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                        >
                          <Pencil className="size-2.5" />
                          <span>Edit</span>
                        </Button>
                      )}
                      {onDeleteInterview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteInterview(interview)}
                          className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive cursor-pointer gap-1"
                        >
                          <Trash2 className="size-2.5" />
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
