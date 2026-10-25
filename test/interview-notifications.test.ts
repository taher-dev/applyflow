import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  isInterviewUnseen,
  checkMilestoneTriggers,
  markInterviewsAsSeen,
  getUnseenInterviewsCount,
  type NotificationRecordStore,
} from '../src/lib/interviewNotifications.ts'
import type { Interview, JobApplication } from '../src/types/dashboard.ts'

describe('Interview Notifications & Responsive Navigation', () => {
  const sampleApplication: JobApplication = {
    id: 'app-stripe-1',
    company: 'Stripe',
    role: 'Staff Systems Engineer',
    appliedDate: '2026-10-01',
    status: 'Interview',
    workplaceType: 'Remote',
  }

  const baseTime = new Date('2026-10-25T14:00:00.000Z').getTime()

  describe('1. Mobile Top Navbar Notification Button Removal', () => {
    test('Header.tsx hides notification button on mobile screens', () => {
      const headerPath = path.resolve('src/components/dashboard/Header.tsx')
      const content = fs.readFileSync(headerPath, 'utf8')

      // Ensure the notification dropdown container is hidden on mobile screens
      assert.match(
        content,
        /hidden\s+md:block[\s\S]*?<DropdownMenu[\s\S]*?<Bell/i,
        'Notification button container must have responsive hidden md:block class to remove it from mobile'
      )

      // Ensure the button trigger itself has hidden md:inline-flex
      assert.match(
        content,
        /className="[^"]*hidden\s+md:inline-flex[^"]*"/,
        'Notification bell button must explicitly have hidden md:inline-flex'
      )
    })
  })

  describe('2. Notification Dot Lifecycle (Disappear on Seen & Reappear at Milestones)', () => {
    test('Initial stage (> 30m away): unseen until user marks as seen, then disappears', () => {
      const scheduledAt = new Date(baseTime + 2 * 60 * 60 * 1000).toISOString() // 2 hours away
      const interview: Interview = {
        id: 'interview-1',
        applicationId: sampleApplication.id,
        scheduledAt,
        type: 'Technical',
        format: 'Video',
      }

      let store: NotificationRecordStore = {}

      // 1. Initially unseen -> notification dot is visible
      assert.equal(
        isInterviewUnseen(interview, store[interview.id], baseTime),
        true,
        'New upcoming interview should initially show notification dot'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, baseTime), 1)

      // 2. User views interviews -> dot disappears
      const seenResult = markInterviewsAsSeen([interview], store, baseTime)
      store = seenResult.updatedStore
      assert.equal(seenResult.hasChanges, true)

      assert.equal(
        isInterviewUnseen(interview, store[interview.id], baseTime),
        false,
        'Notification dot must disappear once the user has seen it'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, baseTime), 0)

      // 3. Stays disappeared at 45 minutes before interview
      const timeAt45m = new Date(scheduledAt).getTime() - 45 * 60 * 1000
      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAt45m),
        false,
        'Notification dot should remain hidden before the 30-minute mark if already seen'
      )
    })

    test('30-minute reminder: triggers alert and notification dot reappears until seen', () => {
      const scheduledAt = new Date(baseTime + 2 * 60 * 60 * 1000).toISOString()
      const interview: Interview = {
        id: 'interview-1',
        applicationId: sampleApplication.id,
        scheduledAt,
        type: 'Technical',
        format: 'Video',
      }

      // Start with interview initially seen (> 30m)
      let store: NotificationRecordStore = {
        [interview.id]: {
          scheduledAt,
          initialSeen: true,
          reminder30mNotified: false,
          reminder30mSeen: false,
          reminder5mNotified: false,
          reminder5mSeen: false,
        },
      }

      // Time arrives at 25 minutes before interview (<= 30m and > 5m)
      const timeAt25m = new Date(scheduledAt).getTime() - 25 * 60 * 1000

      // Evaluate milestone triggers
      const checkResult = checkMilestoneTriggers(
        [interview],
        [sampleApplication],
        store,
        timeAt25m
      )

      assert.equal(checkResult.triggers.length, 1)
      assert.equal(checkResult.triggers[0].milestone, '30m')
      assert.equal(checkResult.triggers[0].companyName, 'Stripe')
      assert.equal(checkResult.triggers[0].role, 'Staff Systems Engineer')

      store = checkResult.updatedStore

      // Notification dot MUST REAPPEAR at 30 minutes!
      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAt25m),
        true,
        'Notification dot must reappear 30 minutes before the interview'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, timeAt25m), 1)

      // Subsequence check does not duplicate notification
      const secondCheck = checkMilestoneTriggers(
        [interview],
        [sampleApplication],
        store,
        timeAt25m + 5000
      )
      assert.equal(secondCheck.triggers.length, 0, 'Must not duplicate 30m alert')

      // User views the interview -> dot disappears again!
      const seenResult = markInterviewsAsSeen([interview], store, timeAt25m)
      store = seenResult.updatedStore

      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAt25m),
        false,
        'Notification dot must disappear once user has seen the 30-minute reminder'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, timeAt25m), 0)
    })

    test('5-minute reminder: triggers urgent alert and notification dot reappears until seen', () => {
      const scheduledAt = new Date(baseTime + 2 * 60 * 60 * 1000).toISOString()
      const interview: Interview = {
        id: 'interview-1',
        applicationId: sampleApplication.id,
        scheduledAt,
        type: 'Technical',
        format: 'Video',
      }

      // Start with 30-minute reminder already seen
      let store: NotificationRecordStore = {
        [interview.id]: {
          scheduledAt,
          initialSeen: true,
          reminder30mNotified: true,
          reminder30mSeen: true,
          reminder5mNotified: false,
          reminder5mSeen: false,
        },
      }

      // Time arrives at 4 minutes before interview (<= 5m and > 0)
      const timeAt4m = new Date(scheduledAt).getTime() - 4 * 60 * 1000

      // Evaluate milestone triggers
      const checkResult = checkMilestoneTriggers(
        [interview],
        [sampleApplication],
        store,
        timeAt4m
      )

      assert.equal(checkResult.triggers.length, 1)
      assert.equal(checkResult.triggers[0].milestone, '5m')
      assert.equal(checkResult.triggers[0].companyName, 'Stripe')

      store = checkResult.updatedStore

      // Notification dot MUST REAPPEAR at 5 minutes!
      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAt4m),
        true,
        'Notification dot must reappear 5 minutes before the interview'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, timeAt4m), 1)

      // User views the interview -> dot disappears again!
      const seenResult = markInterviewsAsSeen([interview], store, timeAt4m)
      store = seenResult.updatedStore

      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAt4m),
        false,
        'Notification dot must disappear once user has seen the 5-minute reminder'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, timeAt4m), 0)

      // Once interview time has passed, dot stays 0
      const timeAfter = new Date(scheduledAt).getTime() + 10 * 60 * 1000
      assert.equal(
        isInterviewUnseen(interview, store[interview.id], timeAfter),
        false,
        'Past interview should not show notification dot'
      )
      assert.equal(getUnseenInterviewsCount([interview], store, timeAfter), 0)
    })
  })

  describe('3. Rescheduled Interviews & Storage Hygiene', () => {
    test('rescheduling an interview resets milestone flags for the new time', () => {
      const originalTime = new Date(baseTime + 10 * 60 * 1000).toISOString() // in 10 mins
      const newScheduledTime = new Date(baseTime + 3 * 60 * 60 * 1000).toISOString() // rescheduled to 3 hours

      const interview: Interview = {
        id: 'interview-rescheduled',
        applicationId: sampleApplication.id,
        scheduledAt: originalTime,
        type: 'Behavioral',
        format: 'Phone',
      }

      // Was at 10m stage and marked seen
      let store: NotificationRecordStore = {
        [interview.id]: {
          scheduledAt: originalTime,
          initialSeen: true,
          reminder30mNotified: true,
          reminder30mSeen: true,
          reminder5mNotified: false,
          reminder5mSeen: false,
        },
      }

      // Interview is rescheduled
      const updatedInterview: Interview = {
        ...interview,
        scheduledAt: newScheduledTime,
      }

      const checkResult = checkMilestoneTriggers(
        [updatedInterview],
        [sampleApplication],
        store,
        baseTime
      )

      store = checkResult.updatedStore

      // Flags must reset for the new scheduled time
      assert.equal(store[interview.id].scheduledAt, newScheduledTime)
      assert.equal(store[interview.id].reminder30mNotified, false)
      assert.equal(store[interview.id].reminder5mNotified, false)
      assert.equal(
        isInterviewUnseen(updatedInterview, store[interview.id], baseTime),
        true,
        'Rescheduled interview should present fresh unseen notification dot'
      )
    })

    test('deleted interviews are pruned from storage', () => {
      const store: NotificationRecordStore = {
        'interview-deleted': {
          scheduledAt: new Date(baseTime + 60 * 60 * 1000).toISOString(),
          initialSeen: true,
        },
      }

      const checkResult = checkMilestoneTriggers(
        [], // empty active interviews
        [sampleApplication],
        store,
        baseTime
      )

      assert.equal(checkResult.updatedStore['interview-deleted'], undefined)
    })
  })

  describe('4. Navigation Components Integration', () => {
    test('MobileBottomNav and Sidebar support unseenInterviewsCount', () => {
      const bottomNavPath = path.resolve('src/components/dashboard/MobileBottomNav.tsx')
      const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')

      assert.match(
        bottomNavContent,
        /unseenInterviewsCount\?: number/,
        'MobileBottomNavProps must accept unseenInterviewsCount'
      )
      assert.match(
        bottomNavContent,
        /unseenInterviewsCount !== undefined \? unseenInterviewsCount : upcomingInterviewsCount/,
        'MobileBottomNav must use unseenInterviewsCount for tab badge'
      )

      const sidebarPath = path.resolve('src/components/dashboard/Sidebar.tsx')
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(
        sidebarContent,
        /unseenInterviewsCount\?: number/,
        'SidebarProps must accept unseenInterviewsCount'
      )
      assert.match(
        sidebarContent,
        /unseenInterviewsCount !== undefined \? unseenInterviewsCount : upcomingInterviewsCount/,
        'Sidebar must use unseenInterviewsCount for interviews badge'
      )
    })
  })
})
