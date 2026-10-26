import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  ExternalLink,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Calendar,
  Building2,
  Bookmark,
  Check,
  Loader2,
  Users,
  GraduationCap,
  Sparkles,
  Gift,
  X,
  Globe,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { DiscoveredJob, DiscoveredJobDetail } from '@/types/job'

interface JobDetailDialogProps {
  job: DiscoveredJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaved: boolean
  isSaving: boolean
  onSaveJob: (job: DiscoveredJob) => void
}

function sanitizeJobHtml(html?: string | null): string {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

function isTkCurrency(salary?: string | null): boolean {
  if (!salary) return false
  return /tk|bdt|৳|taka/i.test(salary)
}

function shouldShowDollarSign(salary?: string | null): boolean {
  if (!salary) return false
  const trimmed = salary.trim().toLowerCase()
  if (isTkCurrency(trimmed)) return false
  if (trimmed === 'negotiable' || trimmed === 'not mentioned' || trimmed === 'undisclosed') return false
  if (trimmed.includes('$')) return false
  return /usd/i.test(trimmed)
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  isSaved,
  isSaving,
  onSaveJob,
}: JobDetailDialogProps) {
  const [fetchedDetails, setFetchedDetails] = useState<DiscoveredJobDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [logoError, setLogoError] = useState<boolean>(false)

  // Fetch complete details whenever dialog opens for a job
  useEffect(() => {
    if (!open || !job) return

    let isMounted = true
    const targetId = job.sourceJobId || job.id
    if (!targetId) return

    Promise.resolve()
      .then(() => {
        if (!isMounted) return null
        setIsLoading(true)
        return api.jobs.getDetails(targetId, job.source || 'bdjobs')
      })
      .then((fullDetail) => {
        if (isMounted && fullDetail) {
          setFetchedDetails(fullDetail)
        }
      })
      .catch(() => {
        // Fallback to basic discovered job data already stored
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [open, job])

  if (!job) return null

  const activeJob: DiscoveredJobDetail =
    fetchedDetails && fetchedDetails.id === job.id
      ? { ...job, ...fetchedDetails }
      : { ...job }
  const companyInitials = (activeJob.company || 'JO').slice(0, 2).toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl max-h-[86vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 bg-white"
      >
        {/* Sticky Modal Header */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 shrink-0 bg-slate-50/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0">
              {/* Company Logo or Styled Initials Avatar */}
              {activeJob.companyLogo && !logoError ? (
                <img
                  src={activeJob.companyLogo}
                  alt={activeJob.company}
                  onError={() => setLogoError(true)}
                  className="size-12 rounded-xl border border-slate-200/80 bg-white object-contain p-1 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="size-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                  {companyInitials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-600 truncate max-w-[240px]">
                    {activeJob.company}
                  </span>
                  <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-full">
                    BDJobs
                  </span>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Loader2 className="size-2.5 animate-spin" />
                      Loading full details...
                    </span>
                  )}
                </div>

                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 mt-1 leading-snug">
                  {activeJob.title}
                </DialogTitle>
              </div>
            </div>

            <DialogClose className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
              <X className="size-4" />
            </DialogClose>
          </div>

          {/* Quick Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-200/60 text-xs">
            {/* Compensation */}
            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">Compensation</span>
              <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
                {shouldShowDollarSign(activeJob.salary) && (
                  <DollarSign className="size-3 text-slate-400 shrink-0 -mr-0.5" />
                )}
                {isTkCurrency(activeJob.salary) && (
                  <span className="text-slate-500 font-bold text-xs">৳</span>
                )}
                <span className="truncate">{activeJob.salary || 'Negotiable'}</span>
              </div>
            </div>

            {/* Location */}
            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">Location</span>
              <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
                <MapPin className="size-3 text-slate-400 shrink-0" />
                <span className="truncate">{activeJob.location || 'Bangladesh'}</span>
              </div>
            </div>

            {/* Job Nature */}
            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">Job Nature</span>
              <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
                <Briefcase className="size-3 text-slate-400 shrink-0" />
                <span className="truncate">{activeJob.employmentType || 'Full Time'}</span>
              </div>
            </div>

            {/* Application Deadline */}
            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">Deadline</span>
              <div className="flex items-center gap-1 font-semibold text-rose-600 mt-0.5 truncate">
                <Calendar className="size-3 text-rose-400 shrink-0" />
                <span className="truncate">{activeJob.deadline || 'Closing soon'}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Job Details Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs sm:text-sm">
          {/* Work Arrangement & Vacancies Extra Strip if available */}
          {(activeJob.workplace || activeJob.vacancies || activeJob.experience || activeJob.ageLimit) && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
              {activeJob.workplace && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                  <Building2 className="size-3.5 text-slate-400" />
                  <span>Workplace: <strong>{activeJob.workplace}</strong></span>
                </span>
              )}
              {activeJob.vacancies && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium border-l border-slate-200 pl-2">
                  <Users className="size-3.5 text-slate-400" />
                  <span>Vacancies: <strong>{activeJob.vacancies}</strong></span>
                </span>
              )}
              {activeJob.experience && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium border-l border-slate-200 pl-2">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>Experience: <strong>{activeJob.experience}</strong></span>
                </span>
              )}
              {activeJob.ageLimit && (
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium border-l border-slate-200 pl-2">
                  <span>Age: <strong>{activeJob.ageLimit}</strong></span>
                </span>
              )}
            </div>
          )}

          {/* Job Context (if present) */}
          {activeJob.jobContext && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Job Context
              </h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200/50">
                {activeJob.jobContext}
              </p>
            </div>
          )}

          {/* Job Responsibilities / Description */}
          {activeJob.responsibilities ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-slate-600" />
                Job Responsibilities
              </h4>
              <div
                className="prose prose-xs sm:prose-sm max-w-none text-slate-700 bg-white p-4 rounded-xl border border-slate-200/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-slate-700 [&_p]:mb-1.5"
                dangerouslySetInnerHTML={{
                  __html: sanitizeJobHtml(activeJob.responsibilities),
                }}
              />
            </div>
          ) : activeJob.summary ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Job Summary
              </h4>
              <p className="text-slate-700 leading-relaxed p-4 rounded-xl border border-slate-200/80 bg-white">
                {activeJob.summary}
              </p>
            </div>
          ) : null}

          {/* Educational Requirements */}
          {activeJob.educationRequirements && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-slate-600" />
                Educational Requirements
              </h4>
              <div
                className="text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: sanitizeJobHtml(activeJob.educationRequirements),
                }}
              />
            </div>
          )}

          {/* Additional Requirements */}
          {activeJob.additionalRequirements && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Additional Requirements
              </h4>
              <div
                className="text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_p]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: sanitizeJobHtml(activeJob.additionalRequirements),
                }}
              />
            </div>
          )}

          {/* Skills Required / Suggested Skills */}
          {activeJob.skills && activeJob.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                Required & Recommended Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeJob.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/60"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compensation & Other Benefits */}
          {activeJob.otherBenefits && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Gift className="size-3.5 text-emerald-600" />
                Compensation & Other Benefits
              </h4>
              <div
                className="text-slate-700 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-200/60 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_p]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: sanitizeJobHtml(activeJob.otherBenefits),
                }}
              />
            </div>
          )}

          {/* Company Profile & Address */}
          {(activeJob.companyBusiness || activeJob.companyAddress || activeJob.companyWebsite) && (
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-slate-600" />
                About {activeJob.company}
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2 text-xs text-slate-700">
                {activeJob.companyBusiness && (
                  <p className="leading-relaxed">{activeJob.companyBusiness}</p>
                )}
                {activeJob.companyAddress && (
                  <p className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeJob.companyAddress}</span>
                  </p>
                )}
                {activeJob.companyWebsite && (
                  <p className="flex items-center gap-1.5 text-blue-600">
                    <Globe className="size-3.5 text-blue-400 shrink-0" />
                    <a
                      href={activeJob.companyWebsite.startsWith('http') ? activeJob.companyWebsite : `https://${activeJob.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {activeJob.companyWebsite}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Application Instructions */}
          {activeJob.applyInstruction && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
              <h4 className="font-bold">Application Instruction</h4>
              <p className="leading-relaxed">{activeJob.applyInstruction}</p>
            </div>
          )}
        </div>

        {/* Sticky Modal Footer */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Check className="size-3.5 text-emerald-600" />
                Saved in your tracker
              </span>
            ) : (
              <span>Full job posting provided via BDJobs</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Save to ApplyFlow Button */}
            <button
              type="button"
              disabled={isSaved || isSaving}
              onClick={() => onSaveJob(activeJob)}
              className={`h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                isSaved
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                  : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 active:bg-slate-100'
              }`}
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
                  <span>Save to ApplyFlow</span>
                </>
              )}
            </button>

            {/* Apply on BDJobs Outbound Button */}
            <a
              href={activeJob.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs select-none"
            >
              <span>Apply on BDJobs</span>
              <ExternalLink className="size-3 text-white/80" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
