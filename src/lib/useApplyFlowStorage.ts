import { useState, useEffect, useCallback, useContext } from 'react'
import type { JobApplication, Interview } from '@/types/dashboard'
import { api, ApiError } from './api.ts'
import {
  toFrontendApplication,
  toBackendCreatePayload,
  toBackendUpdatePayload,
  toFrontendInterview,
  toBackendInterviewCreatePayload,
  toBackendInterviewUpdatePayload,
} from './application-mapper.ts'
import { AuthContext } from '../context/auth-context.ts'

export function useApplyFlowStorage() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user || null

  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState<boolean>(() => Boolean(user))
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [isLoadingInterviews, setIsLoadingInterviews] = useState<boolean>(() => Boolean(user))
  const [interviewsError, setInterviewsError] = useState<string | null>(null)

  const [prevUser, setPrevUser] = useState(user)

  // Strict user isolation: On user logout or switch, immediately wipe memory state
  // to guarantee a user's data never flashes or leaks to another user.
  if (user !== prevUser) {
    setPrevUser(user)
    if (!user) {
      setApplications([])
      setInterviews([])
      setIsLoadingApplications(false)
      setIsLoadingInterviews(false)
      setApplicationsError(null)
      setInterviewsError(null)
    } else {
      setApplications([])
      setInterviews([])
      setIsLoadingApplications(true)
      setIsLoadingInterviews(true)
      setApplicationsError(null)
      setInterviewsError(null)
    }
  }

  // Fetch applications from PostgreSQL backend via typed API client
  const fetchApplications = useCallback(async () => {
    if (!user) {
      setApplications([])
      setIsLoadingApplications(false)
      return
    }

    setIsLoadingApplications(true)
    setApplicationsError(null)

    try {
      const backendApps = await api.applications.getAll()
      const mapped = backendApps.map(toFrontendApplication)
      setApplications(mapped)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to load applications from server'
      setApplicationsError(message)
    } finally {
      setIsLoadingApplications(false)
    }
  }, [user])

  // Fetch interviews from PostgreSQL backend via typed API client
  const fetchInterviews = useCallback(async () => {
    if (!user) {
      setInterviews([])
      setIsLoadingInterviews(false)
      return
    }

    setIsLoadingInterviews(true)
    setInterviewsError(null)

    try {
      const backendInterviews = await api.interviews.getAll()
      const mapped = backendInterviews.map(toFrontendInterview)
      setInterviews(mapped)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to load interviews from server'
      setInterviewsError(message)
    } finally {
      setIsLoadingInterviews(false)
    }
  }, [user])

  // Fetch both applications and interviews on mount / user change
  useEffect(() => {
    if (!user) return

    let ignore = false

    Promise.allSettled([api.applications.getAll(), api.interviews.getAll()]).then(
      ([appsResult, interviewsResult]) => {
        if (ignore) return

        if (appsResult.status === 'fulfilled') {
          setApplications(appsResult.value.map(toFrontendApplication))
          setApplicationsError(null)
        } else {
          const message =
            appsResult.reason instanceof ApiError
              ? appsResult.reason.message
              : 'Unable to load applications from server'
          setApplicationsError(message)
        }
        setIsLoadingApplications(false)

        if (interviewsResult.status === 'fulfilled') {
          setInterviews(interviewsResult.value.map(toFrontendInterview))
          setInterviewsError(null)
        } else {
          const message =
            interviewsResult.reason instanceof ApiError
              ? interviewsResult.reason.message
              : 'Unable to load interviews from server'
          setInterviewsError(message)
        }
        setIsLoadingInterviews(false)
      }
    )

    return () => {
      ignore = true
    }
  }, [user])

  // Create an application on the backend
  const createApplication = useCallback(
    async (appData: Omit<JobApplication, 'id'>): Promise<JobApplication> => {
      const payload = toBackendCreatePayload(appData)
      const createdBackend = await api.applications.create(payload)
      const frontendApp = toFrontendApplication(createdBackend)

      setApplications((prev) => [frontendApp, ...prev])
      return frontendApp
    },
    []
  )

  // Update an application on the backend
  const updateApplication = useCallback(
    async (id: string, appData: Partial<JobApplication>): Promise<JobApplication> => {
      const payload = toBackendUpdatePayload(appData)
      const updatedBackend = await api.applications.update(id, payload)
      const frontendApp = toFrontendApplication(updatedBackend)

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? frontendApp : app))
      )
      return frontendApp
    },
    []
  )

  // Delete an application on the backend
  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      await api.applications.delete(id)
      setApplications((prev) => prev.filter((app) => app.id !== id))
      // Cascade delete in client state matching database onDelete: Cascade
      setInterviews((prev) => prev.filter((interview) => interview.applicationId !== id))
    },
    []
  )

  // Create an interview on the backend
  const createInterview = useCallback(
    async (
      interviewData: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Interview> => {
      const payload = toBackendInterviewCreatePayload(interviewData)
      const createdBackend = await api.interviews.create(payload)
      const frontendInterview = toFrontendInterview(createdBackend)

      setInterviews((prev) => [frontendInterview, ...prev])
      return frontendInterview
    },
    []
  )

  // Update an interview on the backend
  const updateInterview = useCallback(
    async (id: string, interviewData: Partial<Interview>): Promise<Interview> => {
      const payload = toBackendInterviewUpdatePayload(interviewData)
      const updatedBackend = await api.interviews.update(id, payload)
      const frontendInterview = toFrontendInterview(updatedBackend)

      setInterviews((prev) =>
        prev.map((item) => (item.id === id ? frontendInterview : item))
      )
      return frontendInterview
    },
    []
  )

  // Delete an interview on the backend
  const deleteInterview = useCallback(
    async (id: string): Promise<void> => {
      await api.interviews.delete(id)
      setInterviews((prev) => prev.filter((item) => item.id !== id))
    },
    []
  )

  // Refresh workspace data from PostgreSQL backend
  const refreshWorkspaceData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: true }
    }
    setIsLoadingApplications(true)
    setIsLoadingInterviews(true)
    try {
      const [backendApps, backendInterviews] = await Promise.all([
        api.applications.getAll(),
        api.interviews.getAll(),
      ])
      setApplications(backendApps.map(toFrontendApplication))
      setInterviews(backendInterviews.map(toFrontendInterview))
      setApplicationsError(null)
      setInterviewsError(null)
      return { success: true }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to refresh data from server'
      setApplicationsError(message)
      setInterviewsError(message)
      return { success: false, error: message }
    } finally {
      setIsLoadingApplications(false)
      setIsLoadingInterviews(false)
    }
  }, [user])

  // Safe fallback for demo data reset: In cloud database mode, demo records cannot be restored
  // without risking user data deletion. Safely refreshes current user data from the server.
  const resetToDemoData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return refreshWorkspaceData()
  }, [refreshWorkspaceData])

  // Clear all data
  const clearAllData = useCallback(() => {
    setApplications([])
    setInterviews([])
  }, [])

  return {
    applications,
    setApplications,
    isLoadingApplications,
    applicationsError,
    refetchApplications: fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    interviews,
    setInterviews,
    isLoadingInterviews,
    interviewsError,
    refetchInterviews: fetchInterviews,
    createInterview,
    updateInterview,
    deleteInterview,
    refreshWorkspaceData,
    resetToDemoData,
    clearAllData,
  }
}
