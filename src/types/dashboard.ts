export type ApplicationStatus =
  | 'Applied'
  | 'Rejected'
  | 'Offer'
  | 'Active'
  | 'Saved'
  | 'Screening'
  | 'Interview'

export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site'

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship'

export type StatusFilter = 'ALL' | ApplicationStatus
export type EmploymentTypeFilter = 'ALL' | EmploymentType
export type DateRangeFilter = 'ALL' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH'

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'company-asc'
  | 'company-desc'
  | 'role-asc'

export interface JobApplication {
  id: string
  company: string
  role: string
  location?: string
  workplaceType: WorkplaceType
  employmentType?: EmploymentType
  jobUrl?: string
  minSalary?: number
  maxSalary?: number
  salary?: string
  appliedDate: string
  status: ApplicationStatus
  notes?: string
  followUpDate?: string
}

export type InterviewType =
  | 'Phone screening'
  | 'Video interview'
  | 'Technical interview'
  | 'On-site interview'
  | 'Final interview'
  | 'Other'

export interface Interview {
  id: string
  applicationId: string
  scheduledAt: string // ISO 8601 string: YYYY-MM-DDTHH:mm
  interviewType?: InterviewType
  notes?: string
  locationOrLink?: string
  interviewer?: string
  createdAt: string
  updatedAt: string
}

// Deprecated alias for backwards-compatibility during migration
export type InterviewStage = InterviewType

export interface UpcomingInterview {
  id: string
  applicationId: string
  company: string
  role: string
  stage: string
  date: string
  time: string
  platform: string
  interviewer: string
}

export interface MetricCardData {
  id: string
  title: string
  value: string | number
  change?: string
  trend?: 'positive' | 'negative' | 'neutral'
  description: string
  iconName: 'briefcase' | 'calendar' | 'award' | 'trending-up'
}

export type NavigationKey =
  | 'overview'
  | 'applications'
  | 'pipeline'
  | 'interviews'
  | 'calendar'
  | 'settings'

export interface NavigationItem {
  key: NavigationKey
  label: string
  icon: string
  badge?: string
  isImplemented: boolean
}
