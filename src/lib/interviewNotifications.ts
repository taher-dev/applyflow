import type { Interview, JobApplication } from '@/types/dashboard'

export interface InterviewNotificationRecord {
  scheduledAt: string
  initialSeen?: boolean
  reminder30mNotified?: boolean
  reminder30mSeen?: boolean
  reminder5mNotified?: boolean
  reminder5mSeen?: boolean
}

export type NotificationRecordStore = Record<string, InterviewNotificationRecord>

export const NOTIFICATION_STORAGE_KEY = 'applyflow_interview_notifications_v1'

export interface MilestoneTrigger {
  interview: Interview
  milestone: '30m' | '5m'
  companyName: string
  role: string
  scheduledAt: string
}

export const THIRTY_MINUTES_MS = 30 * 60 * 1000
export const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Determines whether a given interview should be considered "unseen"
 * based on its time to start and whether the user has viewed the notification
 * for its current lifecycle stage.
 */
export function isInterviewUnseen(
  interview: Interview,
  record: InterviewNotificationRecord | undefined,
  now: number
): boolean {
  const scheduledTime = new Date(interview.scheduledAt).getTime()
  if (isNaN(scheduledTime) || scheduledTime <= now) {
    return false
  }

  const diffMs = scheduledTime - now

  // 1. Within 5 minutes: unseen if 5m reminder has not been seen
  if (diffMs <= FIVE_MINUTES_MS) {
    return !record?.reminder5mSeen
  }

  // 2. Within 30 minutes: unseen if 30m reminder has not been seen
  if (diffMs <= THIRTY_MINUTES_MS) {
    return !record?.reminder30mSeen
  }

  // 3. Normal upcoming interview (> 30 minutes away): unseen until initially viewed
  return !record?.initialSeen
}

/**
 * Checks all active upcoming interviews against 30-minute and 5-minute reminder milestones.
 * Triggers any pending notifications and flags them as notified, setting unseen to true
 * so the notification dot reappears.
 */
export function checkMilestoneTriggers(
  interviews: Interview[],
  applications: JobApplication[],
  currentStore: NotificationRecordStore,
  now: number
): {
  updatedStore: NotificationRecordStore
  triggers: MilestoneTrigger[]
  hasChanges: boolean
} {
  const applicationMap = new Map<string, JobApplication>()
  for (const app of applications) {
    applicationMap.set(app.id, app)
  }

  const updatedStore: NotificationRecordStore = { ...currentStore }
  const triggers: MilestoneTrigger[] = []
  let hasChanges = false

  const activeIds = new Set(interviews.map((i) => i.id))

  for (const interview of interviews) {
    const scheduledTime = new Date(interview.scheduledAt).getTime()
    if (isNaN(scheduledTime) || scheduledTime <= now) {
      continue
    }

    const diffMs = scheduledTime - now
    let record = updatedStore[interview.id]

    // If record doesn't exist or scheduledAt was changed (e.g. rescheduled)
    if (!record || record.scheduledAt !== interview.scheduledAt) {
      record = {
        scheduledAt: interview.scheduledAt,
        initialSeen: false,
        reminder30mNotified: false,
        reminder30mSeen: false,
        reminder5mNotified: false,
        reminder5mSeen: false,
      }
      updatedStore[interview.id] = record
      hasChanges = true
    }

    const app = applicationMap.get(interview.applicationId)
    const companyName = app?.company || 'Opportunity'
    const role = app?.role || 'Interview'

    // Milestone A: 5-minute reminder
    if (diffMs <= FIVE_MINUTES_MS) {
      if (!record.reminder5mNotified) {
        record.reminder5mNotified = true
        record.reminder5mSeen = false
        // Mark 30m as already satisfied so it doesn't double trigger if loaded late
        record.reminder30mNotified = true
        record.reminder30mSeen = true

        triggers.push({
          interview,
          milestone: '5m',
          companyName,
          role,
          scheduledAt: interview.scheduledAt,
        })
        hasChanges = true
      }
    }
    // Milestone B: 30-minute reminder
    else if (diffMs <= THIRTY_MINUTES_MS) {
      if (!record.reminder30mNotified) {
        record.reminder30mNotified = true
        record.reminder30mSeen = false

        triggers.push({
          interview,
          milestone: '30m',
          companyName,
          role,
          scheduledAt: interview.scheduledAt,
        })
        hasChanges = true
      }
    }
  }

  // Clean up any stale records for interviews that no longer exist
  for (const storedId of Object.keys(updatedStore)) {
    if (!activeIds.has(storedId)) {
      delete updatedStore[storedId]
      hasChanges = true
    }
  }

  return { updatedStore, triggers, hasChanges }
}

/**
 * Marks all active upcoming interviews as seen for their current milestone stage.
 * When called, this clears the notification dot.
 */
export function markInterviewsAsSeen(
  interviews: Interview[],
  currentStore: NotificationRecordStore,
  now: number
): {
  updatedStore: NotificationRecordStore
  hasChanges: boolean
} {
  const updatedStore: NotificationRecordStore = { ...currentStore }
  let hasChanges = false

  for (const interview of interviews) {
    const scheduledTime = new Date(interview.scheduledAt).getTime()
    if (isNaN(scheduledTime) || scheduledTime <= now) {
      continue
    }

    const diffMs = scheduledTime - now
    let record = updatedStore[interview.id]

    if (!record || record.scheduledAt !== interview.scheduledAt) {
      record = {
        scheduledAt: interview.scheduledAt,
      }
      updatedStore[interview.id] = record
      hasChanges = true
    }

    if (diffMs <= FIVE_MINUTES_MS) {
      if (!record.reminder5mSeen) {
        record.reminder5mSeen = true
        record.reminder30mSeen = true
        record.initialSeen = true
        hasChanges = true
      }
    } else if (diffMs <= THIRTY_MINUTES_MS) {
      if (!record.reminder30mSeen) {
        record.reminder30mSeen = true
        record.initialSeen = true
        hasChanges = true
      }
    } else {
      if (!record.initialSeen) {
        record.initialSeen = true
        hasChanges = true
      }
    }
  }

  return { updatedStore, hasChanges }
}

/**
 * Returns total count of interviews that are currently unseen.
 */
export function getUnseenInterviewsCount(
  interviews: Interview[],
  store: NotificationRecordStore,
  now: number
): number {
  return interviews.filter((interview) =>
    isInterviewUnseen(interview, store[interview.id], now)
  ).length
}

export function loadNotificationStore(): NotificationRecordStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as NotificationRecordStore
  } catch {
    return {}
  }
}

export function saveNotificationStore(store: NotificationRecordStore): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // QuotaExceeded or disabled storage
  }
}

export function clearNotificationStore(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.removeItem(NOTIFICATION_STORAGE_KEY)
  } catch {
    // QuotaExceeded or disabled storage
  }
}
