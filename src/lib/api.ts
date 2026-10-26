import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/auth'
import type {
  BackendApplication,
  ApplicationsResponse,
  ApplicationResponse,
  CreateApplicationPayload,
  UpdateApplicationPayload,
} from '@/types/application'
import type {
  BackendInterview,
  InterviewsResponse,
  InterviewResponse,
  CreateInterviewPayload,
  UpdateInterviewPayload,
} from '@/types/interview'
import type { JobSearchParams, JobSearchResponse } from '@/types/job'

/**
 * Standard typed API error carrying status code and structured validation details.
 */
export class ApiError extends Error {
  public status: number
  public errorType: string
  public code?: string
  public details?: unknown

  constructor(
    message: string,
    status: number,
    errorType = 'Error',
    details?: unknown,
    code?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorType = errorType
    this.code = code || errorType
    this.details = details
  }
}

/**
 * Resolves the base URL for API requests.
 * Uses VITE_API_URL if configured, otherwise defaults to '/api' (handled by Vite dev proxy).
 */
export function getApiBaseUrl(): string {
  // Safe evaluation supporting both browser and Node/testing environments
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  }
  return '/api'
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/**
 * Core HTTP client wrapper with credentials: 'include', JSON serialization,
 * and robust error normalization.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  let body: BodyInit | undefined = undefined

  if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    body,
    // Ensure session cookies are sent and stored across requests
    credentials: 'include',
  }

  let response: Response

  try {
    response = await fetch(url, fetchOptions)
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Network connection failed'
    throw new ApiError(
      `Unable to connect to the server: ${errorMsg}`,
      0,
      'NETWORK_ERROR',
      undefined,
      'NETWORK_ERROR'
    )
  }

  // Handle empty successful responses (e.g., 204 No Content)
  if (response.status === 204) {
    return {} as T
  }

  // Parse response payload safely
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  let responseData: unknown
  try {
    responseData = isJson ? await response.json() : await response.text()
  } catch {
    responseData = null
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorType = response.statusText || 'ApiError'
    let code: string | undefined = undefined
    let details: unknown = undefined

    if (responseData && typeof responseData === 'object') {
      const errObj = responseData as Record<string, unknown>
      if (typeof errObj.message === 'string') {
        errorMessage = errObj.message
      }

      if (typeof errObj.error === 'string') {
        errorType = errObj.error
        code = errObj.error
      } else if (errObj.error && typeof errObj.error === 'object') {
        const nested = errObj.error as Record<string, unknown>
        if (typeof nested.message === 'string') errorMessage = nested.message
        if (typeof nested.code === 'string') code = nested.code
        if (nested.details !== undefined) details = nested.details
      }

      if (typeof errObj.code === 'string') {
        code = errObj.code
      }

      if (errObj.details !== undefined) {
        details = errObj.details
      }
    } else if (typeof responseData === 'string' && responseData.trim()) {
      errorMessage = responseData
    }

    if (
      (response.status === 502 || response.status === 503 || response.status === 504) &&
      (!responseData || errorMessage.startsWith('Request failed with status') || errorMessage.includes('<html'))
    ) {
      errorMessage = `Unable to connect to the backend server (${response.status} ${response.statusText || 'Bad Gateway'}). Please ensure the API server is running.`
    }

    throw new ApiError(errorMessage, response.status, errorType, details, code)
  }

  return responseData as T
}

/**
 * Typed API modules for ApplyFlow.
 */
export const api = {
  auth: {
    /**
     * Verifies session cookie and returns current authenticated user.
     */
    async getMe(): Promise<User> {
      const data = await apiClient<AuthResponse>('/auth/me', {
        method: 'GET',
      })
      return data.user
    },

    /**
     * Authenticates user with email and password, establishing session cookie.
     */
    async login(credentials: LoginCredentials): Promise<User> {
      const data = await apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
      })
      return data.user
    },

    /**
     * Registers a new account, establishing session cookie.
     */
    async register(credentials: RegisterCredentials): Promise<User> {
      const data = await apiClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: credentials,
      })
      return data.user
    },

    /**
     * Authenticates or registers via Google, establishing session cookie.
     */
    async googleLogin(payload?: { credential?: string; email?: string; name?: string }): Promise<User> {
      const data = await apiClient<AuthResponse>('/auth/google', {
        method: 'POST',
        body: payload || {},
      })
      return data.user
    },

    /**
     * Requests password reset instructions for an email address.
     */
    async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
      return await apiClient<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      })
    },

    /**
     * Confirms that a password reset token from an email link is valid and unexpired.
     */
    async confirmResetToken(token: string): Promise<{ valid: boolean; email?: string; name?: string; message: string }> {
      return await apiClient<{ valid: boolean; email?: string; name?: string; message: string }>('/auth/confirm-reset-token', {
        method: 'POST',
        body: { token },
      })
    },

    /**
     * Resets user password using a verified single-use reset token.
     */
    async resetPassword(payload: { token: string; newPassword: string }): Promise<{ message: string; email?: string }> {
      return await apiClient<{ message: string; email?: string }>('/auth/reset-password', {
        method: 'POST',
        body: payload,
      })
    },

    /**
     * Revokes session on backend and clears browser cookie.
     */
    async logout(): Promise<void> {
      await apiClient<{ message: string }>('/auth/logout', {
        method: 'POST',
      })
    },
  },

  applications: {
    /**
     * Lists all applications owned by the authenticated user.
     */
    async getAll(): Promise<BackendApplication[]> {
      const data = await apiClient<ApplicationsResponse>('/applications', {
        method: 'GET',
      })
      return data.applications
    },

    /**
     * Retrieves a single application by ID owned by the authenticated user.
     */
    async getById(id: string): Promise<BackendApplication> {
      const data = await apiClient<ApplicationResponse>(`/applications/${encodeURIComponent(id)}`, {
        method: 'GET',
      })
      return data.application
    },

    /**
     * Creates a new application for the authenticated user.
     */
    async create(payload: CreateApplicationPayload): Promise<BackendApplication> {
      const data = await apiClient<ApplicationResponse>('/applications', {
        method: 'POST',
        body: payload,
      })
      return data.application
    },

    /**
     * Updates an existing application owned by the authenticated user.
     */
    async update(id: string, payload: UpdateApplicationPayload): Promise<BackendApplication> {
      const data = await apiClient<ApplicationResponse>(`/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: payload,
      })
      return data.application
    },

    /**
     * Deletes an application owned by the authenticated user.
     */
    async delete(id: string): Promise<void> {
      await apiClient<{ message: string }>(`/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    },
  },

  interviews: {
    /**
     * Lists all interviews owned by the authenticated user.
     */
    async getAll(): Promise<BackendInterview[]> {
      const data = await apiClient<InterviewsResponse>('/interviews', {
        method: 'GET',
      })
      return data.interviews
    },

    /**
     * Retrieves a single interview by ID owned by the authenticated user.
     */
    async getById(id: string): Promise<BackendInterview> {
      const data = await apiClient<InterviewResponse>(`/interviews/${encodeURIComponent(id)}`, {
        method: 'GET',
      })
      return data.interview
    },

    /**
     * Creates a new interview for an application owned by the authenticated user.
     */
    async create(payload: CreateInterviewPayload): Promise<BackendInterview> {
      const data = await apiClient<InterviewResponse>('/interviews', {
        method: 'POST',
        body: payload,
      })
      return data.interview
    },

    /**
     * Updates an existing interview owned by the authenticated user.
     */
    async update(id: string, payload: UpdateInterviewPayload): Promise<BackendInterview> {
      const data = await apiClient<InterviewResponse>(`/interviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: payload,
      })
      return data.interview
    },

    /**
     * Deletes an interview owned by the authenticated user.
     */
    async delete(id: string): Promise<void> {
      await apiClient<{ message: string }>(`/interviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    },
  },

  jobs: {
    /**
     * Searches jobs across supported providers (BDJobs).
     */
    async search(params: JobSearchParams = {}): Promise<JobSearchResponse> {
      const searchParams = new URLSearchParams()
      const query = params.query ?? params.q
      if (query) searchParams.set('q', query)
      if (params.location) searchParams.set('location', params.location)
      if (params.employmentType) searchParams.set('employmentType', params.employmentType)
      if (params.page) searchParams.set('page', String(params.page))
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
      if (params.provider) searchParams.set('provider', params.provider)

      const qs = searchParams.toString()
      const endpoint = qs ? `/jobs/search?${qs}` : '/jobs/search'
      return apiClient<JobSearchResponse>(endpoint, {
        method: 'GET',
      })
    },
  },
}

