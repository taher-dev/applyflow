import type { ApplicationStatus } from '@/types/dashboard'

export interface ColumnDefinition {
  status: ApplicationStatus
  label: string
  description: string
  color: string
  dotClass: string
  badgeClass: string
  activeDropClass: string
}

export const STAGE_ORDER: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
]

export const PIPELINE_COLUMNS: ColumnDefinition[] = [
  {
    status: 'Saved',
    label: 'Saved',
    description: 'Bookmarked opportunities & drafts',
    color: 'slate',
    dotClass: 'bg-slate-400',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    activeDropClass:
      'border-slate-400 bg-slate-100/60 dark:bg-slate-900/40 ring-2 ring-slate-400/20',
  },
  {
    status: 'Applied',
    label: 'Applied',
    description: 'Resumes & cover letters submitted',
    color: 'sky',
    dotClass: 'bg-sky-500',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    activeDropClass:
      'border-sky-400 bg-sky-50/60 dark:bg-sky-950/40 ring-2 ring-sky-400/20',
  },
  {
    status: 'Screening',
    label: 'Screening',
    description: 'Recruiter reach-outs & initial screens',
    color: 'amber',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeDropClass:
      'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-400/20',
  },
  {
    status: 'Interview',
    label: 'Interview',
    description: 'Technical & hiring manager rounds',
    color: 'blue',
    dotClass: 'bg-blue-600',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    activeDropClass:
      'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20',
  },
  {
    status: 'Offer',
    label: 'Offer',
    description: 'Formal employment offers received',
    color: 'emerald',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    activeDropClass:
      'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20',
  },
  {
    status: 'Rejected',
    label: 'Rejected',
    description: 'Closed roles & archived submissions',
    color: 'rose',
    dotClass: 'bg-rose-500',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    activeDropClass:
      'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 ring-2 ring-rose-400/20',
  },
]

export function getNextStatus(current: ApplicationStatus): ApplicationStatus | null {
  const currentIndex = STAGE_ORDER.indexOf(current)
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[currentIndex + 1]
}

export function getPreviousStatus(current: ApplicationStatus): ApplicationStatus | null {
  const currentIndex = STAGE_ORDER.indexOf(current)
  if (currentIndex <= 0) return null
  return STAGE_ORDER[currentIndex - 1]
}
