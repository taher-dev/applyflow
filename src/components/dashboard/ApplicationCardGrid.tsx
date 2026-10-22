import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplicationCardGridProps {
  applications: JobApplication[]
  onEditApplication: (application: JobApplication) => void
  onDeleteApplication: (application: JobApplication) => void
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus) => void
}

interface PastelTheme {
  bg: string
  border: string
  hoverBorder: string
}

/**
 * Returns pastel card colors inspired directly by the reference design.
 * Features soft mint, lavender, ice blue, powder blue, rose, cyan, and blush tones.
 */
function getCardTheme(status: ApplicationStatus, index: number): PastelTheme {
  switch (status) {
    case 'Offer':
      return {
        bg: 'bg-[#EAF8EE]',
        border: 'border-[#D5EEDB]',
        hoverBorder: 'hover:border-emerald-300',
      }
    case 'Active':
    case 'Applied':
    case 'Interview':
    case 'Screening':
      return index % 3 === 0
        ? {
            bg: 'bg-[#F2EDFB]',
            border: 'border-[#E3DCF8]',
            hoverBorder: 'hover:border-purple-300',
          }
        : index % 3 === 1
        ? {
            bg: 'bg-[#EAF2FC]',
            border: 'border-[#D3E3F8]',
            hoverBorder: 'hover:border-sky-300',
          }
        : {
            bg: 'bg-[#EFF1FB]',
            border: 'border-[#DDD8F8]',
            hoverBorder: 'hover:border-indigo-300',
          }
    case 'Rejected':
      return index % 2 === 0
        ? {
            bg: 'bg-[#FCECEE]',
            border: 'border-[#F8D4D9]',
            hoverBorder: 'hover:border-rose-300',
          }
        : {
            bg: 'bg-[#FDF0ED]',
            border: 'border-[#FADCD5]',
            hoverBorder: 'hover:border-orange-300',
          }
    case 'Saved':
    default:
      return {
        bg: 'bg-[#EFF3F6]',
        border: 'border-[#DCE4EC]',
        hoverBorder: 'hover:border-slate-300',
      }
  }
}

function formatCardDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSalary(app: JobApplication): string {
  if (app.salary && app.salary.trim()) {
    return app.salary
  }
  if (app.minSalary && app.maxSalary) {
    const formatNumber = (num: number) =>
      num >= 1000 ? `$${num.toLocaleString('en-US')}` : `$${num}`
    return `${formatNumber(app.minSalary)} - ${app.maxSalary.toLocaleString('en-US')}`
  }
  if (app.minSalary) {
    return `From $${app.minSalary.toLocaleString('en-US')}`
  }
  if (app.maxSalary) {
    return `Up to $${app.maxSalary.toLocaleString('en-US')}`
  }
  return 'Undisclosed'
}

export function ApplicationCardGrid({
  applications,
  onEditApplication,
  onDeleteApplication,
}: ApplicationCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 p-4 sm:p-6">
      {applications.map((app, index) => {
        const theme = getCardTheme(app.status, index)

        return (
          <div
            key={app.id}
            onClick={() => onEditApplication(app)}
            className={cn(
              'group relative rounded-2xl sm:rounded-3xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
              theme.bg,
              theme.border,
              theme.hoverBorder
            )}
          >
            {/* Top row: Date and Close / Delete action */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  {formatCardDate(app.appliedDate)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteApplication(app)
                  }}
                  className="size-6 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-black/5 transition-colors cursor-pointer"
                  aria-label={`Delete application for ${app.role} at ${app.company}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Company & Role */}
              <div className="mt-3 min-w-0">
                <p className="text-xs font-semibold text-slate-500 tracking-normal truncate mb-0.5">
                  {app.company}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
                  {app.role}
                </h3>
              </div>

              {/* Badges / Pill Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3.5">
                {app.employmentType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/95 text-slate-700 shadow-2xs border border-black/5">
                    {app.employmentType}
                  </span>
                )}
                {app.workplaceType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/95 text-slate-700 shadow-2xs border border-black/5">
                    {app.workplaceType}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/95 text-slate-700 shadow-2xs border border-black/5">
                  {app.status === 'Offer' ? 'Offer' : app.status === 'Rejected' ? 'Rejected' : 'Applied'}
                </span>
              </div>
            </div>

            {/* Bottom row: Salary and Details Button */}
            <div className="flex items-center justify-between gap-2 mt-6 pt-1">
              <div className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {formatSalary(app)}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditApplication(app)
                }}
                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer shrink-0"
              >
                Details
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
