import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { JobApplication, Interview } from '@/types/dashboard'
import {
  loadApplications,
  saveApplications,
  loadInterviews,
  saveInterviews,
  isStorageAvailable,
} from './storage'
import { initialApplications, initialInterviews } from '@/data/mockData'

export function useApplyFlowStorage() {
  const isHydratedRef = useRef(false)

  // 1. Lazy state initialization: executes exactly once on component mount.
  // This guarantees synchronous initial render with persisted data, zero screen flicker,
  // and completely avoids overwriting saved data with initial mock data.
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    const loaded = loadApplications()
    if (loaded.data !== null) {
      return loaded.data
    }
    if (loaded.isFirstVisit) {
      // First-time visitor: seed storage with default demonstration applications
      saveApplications(initialApplications)
      return initialApplications
    }
    // Storage unavailable or unrecoverable: fall back to in-memory demo data
    return initialApplications
  })

  const [interviews, setInterviews] = useState<Interview[]>(() => {
    // Validate interview foreign keys against the applications loaded above
    const loadedApps = loadApplications()
    const activeApps = loadedApps.data !== null ? loadedApps.data : initialApplications
    const validAppIds = new Set(activeApps.map((a) => a.id))

    const loadedInterviews = loadInterviews(validAppIds)
    if (loadedInterviews.data !== null) {
      return loadedInterviews.data
    }
    if (loadedInterviews.isFirstVisit) {
      // First-time visitor: seed storage with default demonstration interviews
      saveInterviews(initialInterviews)
      return initialInterviews
    }
    return initialInterviews
  })

  // 2. Hydration & Availability Notification
  useEffect(() => {
    isHydratedRef.current = true

    if (!isStorageAvailable()) {
      toast.warning('Local storage unavailable', {
        description: 'Changes will be preserved in memory for this session only.',
      })
    }
  }, [])

  // 3. Selective persistence effects: only write to localStorage AFTER initial hydration has occurred.
  // This ensures that state updates caused by adding, editing, deleting, or status changes are persisted,
  // while React Strict Mode's double mounting cannot trigger accidental overwrite loops.
  useEffect(() => {
    if (!isHydratedRef.current) return
    saveApplications(applications)
  }, [applications])

  useEffect(() => {
    if (!isHydratedRef.current) return
    saveInterviews(interviews)
  }, [interviews])

  // 4. Reset to Demo Data: Restores default initial mock applications & interviews
  const resetToDemoData = useCallback(() => {
    setApplications(initialApplications)
    setInterviews(initialInterviews)
    saveApplications(initialApplications)
    saveInterviews(initialInterviews)
  }, [])

  // 5. Clear All Data: Empties state and writes empty arrays
  const clearAllData = useCallback(() => {
    setApplications([])
    setInterviews([])
    saveApplications([])
    saveInterviews([])
  }, [])

  return {
    applications,
    setApplications,
    interviews,
    setInterviews,
    resetToDemoData,
    clearAllData,
  }
}
