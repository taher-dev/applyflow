import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  Video,
  User,
  Plus,
  X,
} from 'lucide-react'
import type { JobApplication, Interview, ApplicationStatus } from '@/types/dashboard'
import { cn } from '@/lib/utils'

export interface ApplicationDetailsDialogProps {
  application: JobApplication | null
  interviews?: Interview[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (application: JobApplication) => void
  onDelete: (application: JobApplication) => void
  onScheduleInterview?: (applicationId: string) => void
}

function getStatusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case 'Offer':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'Applied':
    case 'Active':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSalaryDisplay(app: JobApplication): string {
  if (app.salary && app.salary.trim()) {
    return app.salary.trim()
  }
  if (app.minSalary !== undefined && app.maxSalary !== undefined) {
    if (app.minSalary === app.maxSalary) {
      return formatCurrency(app.minSalary)
    }
    return `${formatCurrency(app.minSalary)} - ${formatCurrency(app.maxSalary)}`
  }
  if (app.minSalary !== undefined) {
    return `From ${formatCurrency(app.minSalary)}`
  }
  if (app.maxSalary !== undefined) {
    return `Up to ${formatCurrency(app.maxSalary)}`
  }
  return 'Compensation not specified'
}

export function ApplicationDetailsDialog({
  application,
  interviews = [],
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onScheduleInterview,
}: ApplicationDetailsDialogProps) {
  const [currentTimestamp] = useState(() => Date.now())

  if (!application) return null

  const appliedDateObj = new Date(application.appliedDate)
  const isValidAppliedDate = !isNaN(appliedDateObj.getTime())

  const formattedAppliedDate = isValidAppliedDate
    ? appliedDateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : application.appliedDate

  const handleEditClick = () => {
    onOpenChange(false)
    onEdit(application)
  }

  const handleDeleteClick = () => {
    onOpenChange(false)
    onDelete(application)
  }

  const handleScheduleClick = () => {
    onOpenChange(false)
    onScheduleInterview?.(application.id)
  }

  const salaryDisplay = formatSalaryDisplay(application)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg max-h-[76vh] flex flex-col p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 bg-white"
      >

        {/* Compact Header */}
        <DialogHeader className="space-y-1.5 pb-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                  getStatusBadgeClass(application.status)
                )}
              >
                {application.status === 'Offer'
                  ? 'Offer'
                  : application.status === 'Rejected'
                    ? 'Rejected'
                    : 'Applied'}
              </span>

              {isValidAppliedDate && (
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="size-3 text-slate-400" />
                  <span>Applied {formattedAppliedDate}</span>
                </span>
              )}
            </div>

            {/* Prominent Cross (X) Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-7 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer border border-slate-200/80 bg-white shadow-2xs shrink-0"
              aria-label="Close dialog"
              title="Close"
            >
              <X className="size-3.5" strokeWidth={2.25} />
            </button>
          </div>

          <div>
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
              {application.role}
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-3.5 text-slate-400 shrink-0" />
              <span>{application.company}</span>
            </p>
          </div>

          <DialogDescription className="sr-only">
            Details for job application at {application.company}.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body with compact height */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1 scrollbar-thin">
          {/* Section 1: Position Logistics (Compact 2x2 grid) */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="size-3 text-slate-700" />
              Position Logistics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Workplace & Employment Type */}
              <div className="flex items-start gap-2 text-slate-700">
                <Building2 className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Arrangement</span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    <span className="font-semibold text-slate-900 text-xs">{application.workplaceType}</span>
                    {application.employmentType && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-slate-700 text-xs">{application.employmentType}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Salary / Compensation */}
              <div className="flex items-start gap-2 text-slate-700">
                <DollarSign className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Compensation</span>
                  <span className="font-semibold text-slate-900 text-xs truncate block">{salaryDisplay}</span>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Location</span>
                  <span className="font-semibold text-slate-900 text-xs truncate block">
                    {application.location || 'Remote / Unspecified'}
                  </span>
                </div>
              </div>

              {/* Follow-up date (if specified) */}
              {application.followUpDate ? (
                <div className="flex items-start gap-2 text-slate-700">
                  <Calendar className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-normal">Next follow-up</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {new Date(application.followUpDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ) : application.jobUrl ? (
                <div className="flex items-start gap-2 text-slate-700">
                  <ExternalLink className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-normal">Original Listing</span>
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-semibold text-xs truncate block"
                    >
                      {application.source === 'bdjobs' ? 'Open on BDJobs' : 'Open original listing'}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {/* External Job Posting URL (if followUpDate is also present) */}
            {application.jobUrl && application.followUpDate && (
              <div className="pt-1.5 border-t border-slate-200/60 text-xs">
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold text-xs"
                >
                  <ExternalLink className="size-3" />
                  <span>{application.source === 'bdjobs' ? 'Open listing on BDJobs' : 'Open original listing'}</span>
                </a>
              </div>
            )}
          </div>

          {/* Section 2: Application Notes */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="size-3 text-slate-700" />
              Notes & Description
            </h4>
            {application.notes ? (
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-24 overflow-y-auto pr-1">
                {application.notes}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No personal notes recorded for this application.
              </p>
            )}
          </div>

          {/* Section 3: Scheduled Interviews Milestone */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Video className="size-3 text-slate-700" />
                Interviews ({interviews.length})
              </h4>
              {onScheduleInterview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleScheduleClick}
                  className="h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1 cursor-pointer"
                >
                  <Plus className="size-2.5" />
                  <span>Schedule round</span>
                </Button>
              )}
            </div>

            {interviews.length > 0 ? (
              <div className="space-y-1.5">
                {interviews.map((interview) => {
                  const interviewDate = new Date(interview.scheduledAt)
                  const isValidDate = !isNaN(interviewDate.getTime())
                  const isUpcoming = isValidDate && interviewDate.getTime() >= currentTimestamp
                  const formattedDate = isValidDate
                    ? interviewDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
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
                      className="p-2 rounded-lg border border-slate-200 bg-white space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-xs">
                          <Calendar className="size-3 text-slate-500" />
                          <span>{formattedDate}</span>
                          {formattedTime && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600 font-normal">{formattedTime}</span>
                            </>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            isUpcoming
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}
                        >
                          {isUpcoming ? 'Upcoming' : 'Completed'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 text-[11px] text-slate-600">
                        {interview.interviewer ? (
                          <div className="flex items-center gap-1">
                            <User className="size-2.5 text-slate-400" />
                            <span>{interview.interviewer}</span>
                          </div>
                        ) : <span />}

                        {interview.locationOrLink && (
                          <div>
                            {interview.locationOrLink.startsWith('http') ? (
                              <a
                                href={interview.locationOrLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Video className="size-3" />
                                <span>Join call</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-600">{interview.locationOrLink}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No interview rounds scheduled yet.
              </p>
            )}
          </div>
        </div>

        {/* Compact Dialog Actions Footer */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2.5 border-t border-slate-100 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </Button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 rounded-lg cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleEditClick}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5 rounded-lg shadow-xs cursor-pointer font-medium"
            >
              <Pencil className="size-3.5" />
              <span>Edit Application</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
