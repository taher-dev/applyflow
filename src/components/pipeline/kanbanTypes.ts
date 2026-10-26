import type { ApplicationStatus } from '@/types/dashboard'

export type KanbanCategory = 'Saved' | 'Applied' | 'Rejected' | 'Offer'

export interface ColumnDefinition {
  id: KanbanCategory
  status: ApplicationStatus
  label: string
  description: string
  color: string
  dotClass: string
  badgeClass: string
  activeDropClass: string
  statuses: ApplicationStatus[]
  dropStatus: ApplicationStatus
}

export const KANBAN_CATEGORIES: KanbanCategory[] = [
  'Saved',
  'Applied',
  'Rejected',
  'Offer',
]

export const PIPELINE_COLUMNS: ColumnDefinition[] = [
  {
    id: 'Saved',
    status: 'Saved',
    label: 'Saved',
    description: 'Discovered opportunities to review & apply',
    color: 'amber',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeDropClass:
      'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-400/20',
    statuses: ['Saved'],
    dropStatus: 'Saved',
  },
  {
    id: 'Applied',
    status: 'Applied',
    label: 'Applied',
    description: 'Applications submitted & active',
    color: 'blue',
    dotClass: 'bg-blue-600',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    activeDropClass:
      'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20',
    statuses: ['Applied', 'Active', 'Screening', 'Interview'],
    dropStatus: 'Applied',
  },
  {
    id: 'Rejected',
    status: 'Rejected',
    label: 'Rejected',
    description: 'Closed roles & archived submissions',
    color: 'rose',
    dotClass: 'bg-rose-500',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    activeDropClass:
      'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 ring-2 ring-rose-400/20',
    statuses: ['Rejected'],
    dropStatus: 'Rejected',
  },
  {
    id: 'Offer',
    status: 'Offer',
    label: 'Offer',
    description: 'Formal employment offers received',
    color: 'emerald',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    activeDropClass:
      'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20',
    statuses: ['Offer'],
    dropStatus: 'Offer',
  },
]

export function getApplicationCategory(status: ApplicationStatus): KanbanCategory {
  switch (status) {
    case 'Saved':
      return 'Saved'
    case 'Offer':
      return 'Offer'
    case 'Rejected':
      return 'Rejected'
    case 'Applied':
    case 'Active':
    case 'Screening':
    case 'Interview':
    default:
      return 'Applied'
  }
}

export function getNextCategory(currentStatus: ApplicationStatus): {
  category: KanbanCategory
  status: ApplicationStatus
} | null {
  const currentCategory = getApplicationCategory(currentStatus)
  const currentIndex = KANBAN_CATEGORIES.indexOf(currentCategory)
  if (currentIndex === -1 || currentIndex >= KANBAN_CATEGORIES.length - 1) return null
  const nextCat = KANBAN_CATEGORIES[currentIndex + 1]
  const col = PIPELINE_COLUMNS.find((c) => c.id === nextCat)
  return col ? { category: col.id, status: col.dropStatus } : null
}

export function getPreviousCategory(currentStatus: ApplicationStatus): {
  category: KanbanCategory
  status: ApplicationStatus
} | null {
  const currentCategory = getApplicationCategory(currentStatus)
  const currentIndex = KANBAN_CATEGORIES.indexOf(currentCategory)
  if (currentIndex <= 0) return null
  const prevCat = KANBAN_CATEGORIES[currentIndex - 1]
  const col = PIPELINE_COLUMNS.find((c) => c.id === prevCat)
  return col ? { category: col.id, status: col.dropStatus } : null
}

export const STAGE_ORDER: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Rejected',
  'Offer',
]

export function getNextStatus(current: ApplicationStatus): ApplicationStatus | null {
  const next = getNextCategory(current)
  return next ? next.status : null
}

export function getPreviousStatus(current: ApplicationStatus): ApplicationStatus | null {
  const prev = getPreviousCategory(current)
  return prev ? prev.status : null
}
