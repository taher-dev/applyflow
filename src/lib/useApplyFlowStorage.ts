import { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { toast } from 'sonner'
import type { JobApplication, Interview } from '@/types/dashboard'
import {
  loadInterviews,
  saveInterviews,
  isStorageAvailable,
} from './storage.ts'
import { initialInterviews } from '../data/mockData.ts'
import { api, ApiError } from './api.ts'
import {
  toFrontendApplication,
  toBackendCreatePayload,
  toBackendUpdatePayload,
} from './application-mapper.ts'
import { AuthContext } from '../context/auth-context.ts'

export function useApplyFlowStorage() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user || null

  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState<boolean>(() => Boolean(user))
  const [applicationsError, setApplicationsError] = useState<string | null>(null)
  const [prevUser, setPrevUser] = useState(user)

  if (user !== prevUser) {
    setPrevUser(user)
    if (!user) {
      setApplications([])
      setIsLoadingApplications(false)
      setApplicationsError(null)
    } else {
      setIsLoadingApplications(true)
    }
  }

  // Local interviews state (persisted strictly to localStorage per Step 4B specifications)
  const [interviews, setInterviews] = useState<Interview[]>(() => {
    const loaded = loadInterviews()
    if (loaded.data !== null) {
      return loaded.data
    }
    if (loaded.isFirstVisit) {
      saveInterviews(initialInterviews)
      return initialInterviews
    }
    return initialInterviews
  })

  const isInterviewHydratedRef = useRef(false)

  // Hydration & Storage Availability Check
  useEffect(() => {
    if (!isStorageAvailable()) {
      toast.warning('Browser local storage unavailable', {
        description: 'Interview data will be preserved in memory for this session only.',
      })
    }
  }, [])

  // Persist interviews to localStorage on state changes
  useEffect(() => {
    if (!isInterviewHydratedRef.current) {
      isInterviewHydratedRef.current = true
      return
    }
    saveInterviews(interviews)
  }, [interviews])

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

  useEffect(() => {
    if (!user) return

    let ignore = false

    api.applications
      .getAll()
      .then((backendApps) => {
        if (!ignore) {
          setApplications(backendApps.map(toFrontendApplication))
          setApplicationsError(null)
          setIsLoadingApplications(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Unable to load applications from server'
          setApplicationsError(message)
          setIsLoadingApplications(false)
        }
      })

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
    },
    []
  )

  // Reset demonstration interviews
  const resetToDemoData = useCallback(() => {
    setInterviews(initialInterviews)
    saveInterviews(initialInterviews)
  }, [])

  // Clear all data
  const clearAllData = useCallback(() => {
    setApplications([])
    setInterviews([])
    saveInterviews([])
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
    resetToDemoData,
    clearAllData,
  }
}
