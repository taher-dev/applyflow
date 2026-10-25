import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { Interview, JobApplication, NavigationKey } from '@/types/dashboard'
import {
  loadNotificationStore,
  saveNotificationStore,
  checkMilestoneTriggers,
  markInterviewsAsSeen,
  getUnseenInterviewsCount,
  type NotificationRecordStore,
} from './interviewNotifications'

function formatInterviewTime(scheduledAt: string): string {
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function useInterviewNotifications(
  interviews: Interview[],
  applications: JobApplication[],
  activeTab: NavigationKey
) {
  const [store, setStore] = useState<NotificationRecordStore>(() => loadNotificationStore())
  const [now, setNow] = useState(() => Date.now())

  // Keep latest refs for interval processing
  const storeRef = useRef(store)
  const interviewsRef = useRef(interviews)
  const applicationsRef = useRef(applications)

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    interviewsRef.current = interviews
    applicationsRef.current = applications
  }, [interviews, applications])

  // Explicit action to mark all active upcoming interviews as seen
  const markAllAsSeen = useCallback(() => {
    const currentNow = Date.now()
    setStore((prevStore) => {
      const { updatedStore, hasChanges } = markInterviewsAsSeen(
        interviewsRef.current,
        prevStore,
        currentNow
      )
      if (hasChanges) {
        saveNotificationStore(updatedStore)
        return updatedStore
      }
      return prevStore
    })
  }, [])

  // Process milestone evaluation and trigger alerts
  const evaluateMilestones = useCallback((currentTimestamp: number) => {
    const { updatedStore, triggers, hasChanges } = checkMilestoneTriggers(
      interviewsRef.current,
      applicationsRef.current,
      storeRef.current,
      currentTimestamp
    )

    if (hasChanges) {
      saveNotificationStore(updatedStore)
      setStore(updatedStore)
    }

    for (const trigger of triggers) {
      const timeStr = formatInterviewTime(trigger.scheduledAt)
      const timeSuffix = timeStr ? ` at ${timeStr}` : ''

      if (trigger.milestone === '5m') {
        const title = `Interview starts in 5 minutes!`
        const description = `Urgent: ${trigger.role} with ${trigger.companyName} starts in 5 minutes${timeSuffix}. Get ready!`
        toast.error(title, {
          description,
          duration: 12000,
        })

        try {
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(title, {
              body: `${trigger.role} with ${trigger.companyName}${timeSuffix}`,
              icon: '/favicon.ico',
            })
          }
        } catch {
          // Graceful fallback for non-browser or test environments
        }
      } else {
        const title = `Upcoming Interview in 30 minutes`
        const description = `${trigger.role} with ${trigger.companyName} is scheduled in 30 minutes${timeSuffix}.`
        toast.warning(title, {
          description,
          duration: 10000,
        })

        try {
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(title, {
              body: `${trigger.role} with ${trigger.companyName}${timeSuffix}`,
              icon: '/favicon.ico',
            })
          }
        } catch {
          // Graceful fallback for non-browser or test environments
        }
      }
    }
  }, [])

  // Periodic timer (every 10s) to keep timestamps fresh and trigger milestone alarms
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      evaluateMilestones(current)
    }, 10000)
    return () => clearInterval(timer)
  }, [evaluateMilestones])

  // Initial and data-change evaluation deferred to asynchronous task
  useEffect(() => {
    const deferTimer = setTimeout(() => {
      evaluateMilestones(Date.now())
    }, 0)
    return () => clearTimeout(deferTimer)
  }, [interviews, applications, evaluateMilestones])

  // Auto-mark notifications as seen when user navigates to the interviews screen
  useEffect(() => {
    if (activeTab === 'interviews') {
      const deferTimer = setTimeout(() => {
        markAllAsSeen()
      }, 0)
      return () => clearTimeout(deferTimer)
    }
  }, [activeTab, markAllAsSeen])

  const unseenCount = getUnseenInterviewsCount(interviews, store, now)

  return {
    unseenCount,
    markAllAsSeen,
  }
}
