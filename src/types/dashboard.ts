export type ApplicationStatus = 'Applied' | 'Reviewing' | 'Interview' | 'Offer' | 'Rejected'

export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site'

export interface JobApplication {
  id: string
  company: string
  role: string
  location: string
  workplaceType: WorkplaceType
  salary?: string
  appliedDate: string
  status: ApplicationStatus
  notes?: string
}

export type InterviewStage =
  | 'Recruiter Screen'
  | 'Technical Assessment'
  | 'System Design'
  | 'Hiring Manager'
  | 'Final Presentation'

export interface UpcomingInterview {
  id: string
  applicationId: string
  company: string
  role: string
  stage: InterviewStage
  date: string
  time: string
  platform: 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'On-site'
  interviewer: string
}

export interface MetricCardData {
  id: string
  title: string
  value: string | number
  change: string
  trend: 'positive' | 'negative' | 'neutral'
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
