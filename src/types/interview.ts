export type BackendInterviewType =
  | 'PHONE_SCREENING'
  | 'VIDEO_INTERVIEW'
  | 'TECHNICAL_INTERVIEW'
  | 'ON_SITE_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OTHER'

export interface BackendInterview {
  id: string
  applicationId: string
  scheduledAt: string
  type: BackendInterviewType
  locationOrLink: string | null
  interviewer: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  application?: {
    id: string
    company: string
    jobTitle: string
    status: string
  }
}

export interface InterviewsResponse {
  interviews: BackendInterview[]
}

export interface InterviewResponse {
  interview: BackendInterview
}

export interface CreateInterviewPayload {
  applicationId: string
  scheduledAt: string
  type?: string
  interviewType?: string
  locationOrLink?: string | null
  interviewer?: string | null
  notes?: string | null
}

export type UpdateInterviewPayload = Partial<CreateInterviewPayload>
