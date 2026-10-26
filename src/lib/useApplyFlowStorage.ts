import { useState, useEffect, useCallback, useContext, useRef } from 'react'
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
import {
  loadApplications,
  saveApplications,
  loadInterviews,
  saveInterviews,
} from './storage.ts'
import {
  detectLegacyApplications,
  importApplicationsToCloud,
  removeImportedFromLocalStorage,
  isDemoApplication,
} from './local-import.ts'
import { toast } from 'sonner'
import { initialInterviews } from '../data/mockData.ts'

function generateLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export function useApplyFlowStorage() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user || null

  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState<boolean>(true)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [isLoadingInterviews, setIsLoadingInterviews] = useState<boolean>(true)
  const [interviewsError, setInterviewsError] = useState<string | null>(null)

  const prevUserRef = useRef(user)

  // Load guest data from localStorage without any populated/mock data
  const loadGuestData = useCallback(() => {
    setIsLoadingApplications(true)
    setIsLoadingInterviews(true)
    setApplicationsError(null)
    setInterviewsError(null)

    try {
      const appResult = loadApplications()
      let currentApps: JobApplication[] = []

      if (appResult.data !== null && Array.isArray(appResult.data)) {
        // Strip out any previously seeded demo applications so guest mode is completely clean
        currentApps = appResult.data.filter((app) => !isDemoApplication(app))
        if (currentApps.length !== appResult.data.length) {
          saveApplications(currentApps)
        }
      } else {
        saveApplications([])
      }
      setApplications(currentApps)

      const validAppIds = new Set(currentApps.map((a) => a.id))
      const intResult = loadInterviews(validAppIds)
      let currentInts: Interview[] = []

      if (intResult.data !== null && Array.isArray(intResult.data)) {
        // Filter out demo interviews and orphaned interviews
        currentInts = intResult.data.filter(
          (item) =>
            validAppIds.has(item.applicationId) &&
            !initialInterviews.some((demo) => demo.id === item.id)
        )
        if (currentInts.length !== intResult.data.length) {
          saveInterviews(currentInts)
        }
      } else {
        saveInterviews([])
      }
      setInterviews(currentInts)
    } catch {
      setApplications([])
      setInterviews([])
      saveApplications([])
      saveInterviews([])
    } finally {
      setIsLoadingApplications(false)
      setIsLoadingInterviews(false)
    }
  }, [])

  // User state transition effect (login/logout/switch)
  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = user

    // Switching between guest and logged in, or between different accounts
    if (user !== prevUser) {
      if (!user) {
        // Logged out -> revert to guest mode with local data
        queueMicrotask(() => {
          loadGuestData()
        })
      } else {
        // Logged in -> auto-sync local guest applications to cloud, then fetch cloud data
        queueMicrotask(() => {
          setIsLoadingApplications(true)
          setIsLoadingInterviews(true)
          setApplications([])
          setInterviews([])
          setApplicationsError(null)
          setInterviewsError(null)
        })

        let ignore = false

        async function syncAndLoad() {
          // If transitioning from guest mode, automatically migrate custom local records to cloud
          if (!prevUser) {
            try {
              const legacy = detectLegacyApplications()
              if (legacy.hasLegacyData && legacy.customRecords.length > 0) {
                const summary = await importApplicationsToCloud(legacy.customRecords)
                if (summary.succeeded.length > 0) {
                  removeImportedFromLocalStorage(summary.succeeded.map((s) => s.legacyId))
                  toast.success(
                    `Saved ${summary.succeeded.length} local application${summary.succeeded.length === 1 ? '' : 's'} to your cloud account!`
                  )
                }
              }
            } catch (err) {
              console.warn('[ApplyFlow] Failed to auto-sync local data:', err)
            }
          }

          if (ignore) return

          try {
            const [appsResult, interviewsResult] = await Promise.allSettled([
              api.applications.getAll(),
              api.interviews.getAll(),
            ])

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
          } catch {
            if (!ignore) {
              setIsLoadingApplications(false)
              setIsLoadingInterviews(false)
            }
          }
        }

        syncAndLoad()

        return () => {
          ignore = true
        }
      }
    }
  }, [user, loadGuestData])

  // Initial load when component mounts
  useEffect(() => {
    let ignore = false

    if (!user) {
      queueMicrotask(() => {
        if (!ignore) loadGuestData()
      })
    } else {
      queueMicrotask(() => {
        if (ignore) return
        setIsLoadingApplications(true)
        setIsLoadingInterviews(true)
      })

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
    }

    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount-only effect

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!user) {
      loadGuestData()
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
  }, [user, loadGuestData])

  // Fetch interviews
  const fetchInterviews = useCallback(async () => {
    if (!user) {
      loadGuestData()
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
  }, [user, loadGuestData])

  // Create an application (Dual-mode: local storage vs cloud API)
  const createApplication = useCallback(
    async (appData: Omit<JobApplication, 'id'>): Promise<JobApplication> => {
      if (!user) {
        // Prevent duplicate saves in guest mode
        if (appData.sourceJobId) {
          const existing = applications.find(
            (a) => a.sourceJobId === appData.sourceJobId && (!appData.source || a.source === appData.source)
          )
          if (existing) {
            throw new ApiError('This job listing is already saved in your tracker', 409, 'Conflict', existing)
          }
        } else if (appData.jobUrl) {
          const existing = applications.find((a) => a.jobUrl === appData.jobUrl)
          if (existing) {
            throw new ApiError('This job listing is already saved in your tracker', 409, 'Conflict', existing)
          }
        }

        const id = generateLocalId('app')
        const frontendApp: JobApplication = {
          ...appData,
          id,
        }
        setApplications((prev) => {
          const next = [frontendApp, ...prev]
          saveApplications(next)
          return next
        })
        return frontendApp
      }

      const payload = toBackendCreatePayload(appData)
      const createdBackend = await api.applications.create(payload)
      const frontendApp = toFrontendApplication(createdBackend)

      setApplications((prev) => [frontendApp, ...prev])
      return frontendApp
    },
    [user, applications]
  )

  // Update an application (Dual-mode: local storage vs cloud API)
  const updateApplication = useCallback(
    async (id: string, appData: Partial<JobApplication>): Promise<JobApplication> => {
      if (!user) {
        let updatedApp: JobApplication | null = null
        setApplications((prev) => {
          const next = prev.map((app) => {
            if (app.id === id) {
              updatedApp = { ...app, ...appData }
              return updatedApp
            }
            return app
          })
          saveApplications(next)
          return next
        })
        if (!updatedApp) {
          throw new Error('Application not found')
        }
        return updatedApp
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

  // Delete an application (Dual-mode: local storage vs cloud API)
  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      if (!user) {
        setApplications((prev) => {
          const next = prev.filter((app) => app.id !== id)
          saveApplications(next)
          return next
        })
        setInterviews((prev) => {
          const next = prev.filter((interview) => interview.applicationId !== id)
          saveInterviews(next)
          return next
        })
        return
      }

      await api.applications.delete(id)
      setApplications((prev) => prev.filter((app) => app.id !== id))
      setInterviews((prev) => prev.filter((interview) => interview.applicationId !== id))
    },
    [user]
  )

  // Create an interview (Dual-mode: local storage vs cloud API)
  const createInterview = useCallback(
    async (
      interviewData: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Interview> => {
      if (!user) {
        const id = generateLocalId('int')
        const now = new Date().toISOString()
        const frontendInterview: Interview = {
          ...interviewData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        setInterviews((prev) => {
          const next = [frontendInterview, ...prev]
          saveInterviews(next)
          return next
        })
        return frontendInterview
      }

      const payload = toBackendInterviewCreatePayload(interviewData)
      const createdBackend = await api.interviews.create(payload)
      const frontendInterview = toFrontendInterview(createdBackend)

      setInterviews((prev) => [frontendInterview, ...prev])
      return frontendInterview
    },
    [user]
  )

  // Update an interview (Dual-mode: local storage vs cloud API)
  const updateInterview = useCallback(
    async (id: string, interviewData: Partial<Interview>): Promise<Interview> => {
      if (!user) {
        let updatedInterview: Interview | null = null
        setInterviews((prev) => {
          const next = prev.map((item) => {
            if (item.id === id) {
              updatedInterview = {
                ...item,
                ...interviewData,
                updatedAt: new Date().toISOString(),
              }
              return updatedInterview
            }
            return item
          })
          saveInterviews(next)
          return next
        })
        if (!updatedInterview) {
          throw new Error('Interview not found')
        }
        return updatedInterview
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

  // Delete an interview (Dual-mode: local storage vs cloud API)
  const deleteInterview = useCallback(
    async (id: string): Promise<void> => {
      if (!user) {
        setInterviews((prev) => {
          const next = prev.filter((item) => item.id !== id)
          saveInterviews(next)
          return next
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
      loadGuestData()
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
  }, [user, loadGuestData])

  // Reset to clean workspace
  const resetToDemoData = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      saveApplications([])
      saveInterviews([])
      setApplications([])
      setInterviews([])
      return { success: true }
    }
    return refreshWorkspaceData()
  }, [user, refreshWorkspaceData])

  // Clear all data
  const clearAllData = useCallback(() => {
    if (!user) {
      saveApplications([])
      saveInterviews([])
    }
    setApplications([])
    setInterviews([])
  }, [user])

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
