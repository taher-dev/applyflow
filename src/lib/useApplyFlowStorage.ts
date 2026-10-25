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
import {
  loadApplications,
  saveApplications,
  loadInterviews,
  saveInterviews,
} from './storage.ts'
import { initialApplications, initialInterviews } from '../data/mockData.ts'
import { AuthContext } from '../context/auth-context.ts'

function getInitialLocalApplications(): JobApplication[] {
  const result = loadApplications()
  if (result.data && result.data.length > 0) {
    return result.data
  }
  saveApplications(initialApplications)
  return initialApplications
}

function getInitialLocalInterviews(): Interview[] {
  const result = loadInterviews()
  if (result.data && result.data.length > 0) {
    return result.data
  }
  saveInterviews(initialInterviews)
  return initialInterviews
}

export function useApplyFlowStorage() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user || null

  const [applications, setApplications] = useState<JobApplication[]>(() => {
    if (user) return []
    return getInitialLocalApplications()
  })
  const [isLoadingApplications, setIsLoadingApplications] = useState<boolean>(() => Boolean(user))
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  const [interviews, setInterviews] = useState<Interview[]>(() => {
    if (user) return []
    return getInitialLocalInterviews()
  })
  const [isLoadingInterviews, setIsLoadingInterviews] = useState<boolean>(() => Boolean(user))
  const [interviewsError, setInterviewsError] = useState<string | null>(null)

  const [prevUser, setPrevUser] = useState(user)

  // Handle user switch / logout
  if (user !== prevUser) {
    setPrevUser(user)
    if (!user) {
      // Switched to guest mode: load local progress
      const localApps = getInitialLocalApplications()
      const localInts = getInitialLocalInterviews()
      setApplications(localApps)
      setInterviews(localInts)
      setIsLoadingApplications(false)
      setIsLoadingInterviews(false)
      setApplicationsError(null)
      setInterviewsError(null)
    } else {
      // Switched to authenticated user: wipe guest state and load from server
      setApplications([])
      setInterviews([])
      setIsLoadingApplications(true)
      setIsLoadingInterviews(true)
      setApplicationsError(null)
      setInterviewsError(null)
    }
  }

  // Fetch applications from server (or reload local storage if guest)
  const fetchApplications = useCallback(async () => {
    if (!user) {
      const localApps = getInitialLocalApplications()
      setApplications(localApps)
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

  // Fetch interviews from server (or reload local storage if guest)
  const fetchInterviews = useCallback(async () => {
    if (!user) {
      const localInts = getInitialLocalInterviews()
      setInterviews(localInts)
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

  // Fetch both applications and interviews on mount / user change if authenticated
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

  // Create an application (local for guest, API for authenticated)
  const createApplication = useCallback(
    async (appData: Omit<JobApplication, 'id'>): Promise<JobApplication> => {
      if (!user) {
        const id = `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const newApp: JobApplication = {
          ...appData,
          id,
        }
        setApplications((prev) => {
          const updated = [newApp, ...prev]
          saveApplications(updated)
          return updated
        })
        return newApp
      }

      const payload = toBackendCreatePayload(appData)
      const createdBackend = await api.applications.create(payload)
      const frontendApp = toFrontendApplication(createdBackend)

      setApplications((prev) => [frontendApp, ...prev])
      return frontendApp
    },
    [user]
  )

  // Update an application (local for guest, API for authenticated)
  const updateApplication = useCallback(
    async (id: string, appData: Partial<JobApplication>): Promise<JobApplication> => {
      if (!user) {
        let updatedApp: JobApplication | undefined
        setApplications((prev) => {
          const updated = prev.map((app) => {
            if (app.id === id) {
              updatedApp = { ...app, ...appData }
              return updatedApp
            }
            return app
          })
          saveApplications(updated)
          return updated
        })
        return updatedApp || ({ id, ...appData } as JobApplication)
      }

      const payload = toBackendUpdatePayload(appData)
      const updatedBackend = await api.applications.update(id, payload)
      const frontendApp = toFrontendApplication(updatedBackend)

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? frontendApp : app))
      )
      return frontendApp
    },
    [user]
  )

  // Delete an application (local for guest, API for authenticated)
  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      if (!user) {
        setApplications((prev) => {
          const updated = prev.filter((app) => app.id !== id)
          saveApplications(updated)
          return updated
        })
        setInterviews((prev) => {
          const updated = prev.filter((interview) => interview.applicationId !== id)
          saveInterviews(updated)
          return updated
        })
        return
      }

      await api.applications.delete(id)
      setApplications((prev) => prev.filter((app) => app.id !== id))
      setInterviews((prev) => prev.filter((interview) => interview.applicationId !== id))
    },
    [user]
  )

  // Create an interview (local for guest, API for authenticated)
  const createInterview = useCallback(
    async (
      interviewData: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Interview> => {
      if (!user) {
        const now = new Date().toISOString()
        const id = `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const newInterview: Interview = {
          ...interviewData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        setInterviews((prev) => {
          const updated = [newInterview, ...prev]
          saveInterviews(updated)
          return updated
        })
        return newInterview
      }

      const payload = toBackendInterviewCreatePayload(interviewData)
      const createdBackend = await api.interviews.create(payload)
      const frontendInterview = toFrontendInterview(createdBackend)

      setInterviews((prev) => [frontendInterview, ...prev])
      return frontendInterview
    },
    [user]
  )

  // Update an interview (local for guest, API for authenticated)
  const updateInterview = useCallback(
    async (id: string, interviewData: Partial<Interview>): Promise<Interview> => {
      if (!user) {
        const now = new Date().toISOString()
        let updatedInterview: Interview | undefined
        setInterviews((prev) => {
          const updated = prev.map((item) => {
            if (item.id === id) {
              updatedInterview = { ...item, ...interviewData, updatedAt: now }
              return updatedInterview
            }
            return item
          })
          saveInterviews(updated)
          return updated
        })
        return updatedInterview || ({ id, ...interviewData } as Interview)
      }

      const payload = toBackendInterviewUpdatePayload(interviewData)
      const updatedBackend = await api.interviews.update(id, payload)
      const frontendInterview = toFrontendInterview(updatedBackend)

      setInterviews((prev) =>
        prev.map((item) => (item.id === id ? frontendInterview : item))
      )
      return frontendInterview
    },
    [user]
  )

  // Delete an interview (local for guest, API for authenticated)
  const deleteInterview = useCallback(
    async (id: string): Promise<void> => {
      if (!user) {
        setInterviews((prev) => {
          const updated = prev.filter((item) => item.id !== id)
          saveInterviews(updated)
          return updated
        })
        return
      }

      await api.interviews.delete(id)
      setInterviews((prev) => prev.filter((item) => item.id !== id))
    },
    [user]
  )

  // Refresh workspace data
  const refreshWorkspaceData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      setApplications(initialApplications)
      saveApplications(initialApplications)
      setInterviews(initialInterviews)
      saveInterviews(initialInterviews)
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

  // Reset demo data
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
