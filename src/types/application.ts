export type BackendApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'

export type BackendWorkplaceType = 'REMOTE' | 'HYBRID' | 'ON_SITE'

export type BackendEmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'

export interface BackendApplication {
  id: string
  userId: string
  company: string
  jobTitle: string
  status: BackendApplicationStatus
  location: string | null
  workplaceType: BackendWorkplaceType
  employmentType: BackendEmploymentType | null
  jobUrl: string | null
  minSalary: number | null
  maxSalary: number | null
  salary: string | null
  appliedAt: string | null
  followUpDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationsResponse {
  applications: BackendApplication[]
}

export interface ApplicationResponse {
  application: BackendApplication
}

export interface CreateApplicationPayload {
  company: string
  jobTitle?: string
  role?: string
  status?: string
  location?: string | null
  workplaceType?: string
  employmentType?: string | null
  jobUrl?: string | null
  minSalary?: number | null
  maxSalary?: number | null
  salary?: string | null
  appliedAt?: string | null
  followUpDate?: string | null
  notes?: string | null
}

export type UpdateApplicationPayload = Partial<CreateApplicationPayload>
