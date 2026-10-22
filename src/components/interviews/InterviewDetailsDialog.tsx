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
  Calendar,
  Clock,
  Video,
  User,
  Building2,
  ExternalLink,
  Pencil,
  Trash2,
  FileText,
  MapPin,
  Briefcase,
  X,
} from 'lucide-react'
import type { Interview, JobApplication } from '@/types/dashboard'
import { cn } from '@/lib/utils'

export interface InterviewDetailsDialogProps {
  interview: Interview | null
  application?: JobApplication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (interview: Interview) => void
  onDelete: (interview: Interview) => void
}

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

export function InterviewDetailsDialog({
  interview,
  application,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: InterviewDetailsDialogProps) {
  const [currentTimestamp] = useState(() => Date.now())

  if (!interview) return null

  const interviewDate = new Date(interview.scheduledAt)
  const isValidDate = !isNaN(interviewDate.getTime())

  const formattedFullDate = isValidDate
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

  const relativeLabel = getRelativeDateLabel(interview.scheduledAt, currentTimestamp)
  const isUpcoming = isValidDate && interviewDate.getTime() >= currentTimestamp

  const handleEditClick = () => {
    onOpenChange(false)
    onEdit(interview)
  }

  const handleDeleteClick = () => {
    onOpenChange(false)
    onDelete(interview)
  }

  const isUrl = Boolean(interview.locationOrLink && interview.locationOrLink.startsWith('http'))

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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {application?.company || 'Company Opportunity'}
              </span>
              {relativeLabel && (
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                    isUpcoming
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}
                >
                  {relativeLabel}
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
              {application?.role || 'Job Interview'}
            </DialogTitle>
          </div>

          <DialogDescription className="sr-only">
            Details and logistics for this scheduled interview round.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body with compact height */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1 scrollbar-thin">
          {/* Section 1: Schedule & Logistics Grid */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="size-3 text-slate-700" />
              Schedule & Timing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 text-slate-700">
                <Calendar className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Date</span>
                  <span className="font-semibold text-slate-900 text-xs">{formattedFullDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <Clock className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Time</span>
                  <span className="font-semibold text-slate-900 text-xs">{formattedTime || 'Undisclosed'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Logistics & Location */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Video className="size-3 text-slate-700" />
              Logistics & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Interviewer */}
              <div className="flex items-start gap-2 text-slate-700">
                <User className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-normal">Interviewer</span>
                  <span className="font-semibold text-slate-900 text-xs truncate block">
                    {interview.interviewer || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Format / Link */}
              <div className="flex items-start gap-2 text-slate-700">
                {isUrl ? (
                  <Video className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                ) : (
                  <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-normal">Meeting Location</span>
                  {interview.locationOrLink ? (
                    isUrl ? (
                      <a
                        href={interview.locationOrLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-xs truncate block"
                      >
                        <span className="truncate">{interview.locationOrLink}</span>
                        <ExternalLink className="size-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-semibold text-slate-900 text-xs break-words">
                        {interview.locationOrLink}
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 italic text-xs">Not specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Video call quick join button */}
            {isUrl && (
              <div className="pt-1.5">
                <a
                  href={interview.locationOrLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Video className="size-3" />
                  <span>Join Video Meeting</span>
                  <ExternalLink className="size-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Section 3: Associated Application Overview */}
          {application && (
            <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="size-3 text-slate-700" />
                Opportunity Context
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-900">{application.company}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700">{application.role}</span>
                {application.workplaceType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                    {application.workplaceType}
                  </span>
                )}
                {application.employmentType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                    {application.employmentType}
                  </span>
                )}
                {application.salary && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium ml-auto">
                    <Briefcase className="size-2.5 inline mr-1 text-slate-400" />
                    {application.salary}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Preparation Notes */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="size-3 text-slate-700" />
              Preparation Notes
            </h4>
            {interview.notes ? (
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-24 overflow-y-auto pr-1">
                {interview.notes}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No preparation notes recorded for this round.
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
              <span>Edit Interview</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
