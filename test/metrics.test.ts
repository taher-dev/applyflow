import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { calculateDashboardMetrics } from '../src/lib/metrics.ts'
import { initialMetrics } from '../src/data/mockData.ts'
import type { JobApplication, Interview } from '../src/types/dashboard.ts'

describe('Dashboard Metrics & Truthful Data Derivation', () => {
  const sampleApplications: JobApplication[] = [
    {
      id: 'app-1',
      company: 'Stripe',
      role: 'Staff Systems Engineer',
      appliedDate: '2026-10-01',
      status: 'Interview',
      workplaceType: 'Remote',
    },
    {
      id: 'app-2',
      company: 'Figma',
      role: 'Lead UI Engineer',
      appliedDate: '2026-10-03',
      status: 'Offer',
      workplaceType: 'Hybrid',
    },
    {
      id: 'app-3',
      company: 'Linear',
      role: 'Product Engineer',
      appliedDate: '2026-10-05',
      status: 'Screening',
      workplaceType: 'Remote',
    },
    {
      id: 'app-4',
      company: 'Datadog',
      role: 'Frontend Systems Architect',
      appliedDate: '2026-10-07',
      status: 'Applied',
      workplaceType: 'Remote',
    },
    {
      id: 'app-5',
      company: 'Vercel',
      role: 'Developer Experience Engineer',
      appliedDate: '2026-10-09',
      status: 'Rejected',
      workplaceType: 'Remote',
    },
    {
      id: 'app-6',
      company: 'GitHub',
      role: 'Open Source Engineer',
      appliedDate: '',
      status: 'Saved',
      workplaceType: 'Remote',
    },
  ]

  const sampleInterviews: Interview[] = [
    {
      id: 'int-1',
      applicationId: 'app-1',
      scheduledAt: '2026-10-28T14:00',
      interviewType: 'Technical interview',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    },
  ]

  describe('1. Absolute metrics reflection from authentic application records', () => {
    test('accurately calculates total applications, interview stage count, offer count, and response rate', () => {
      const metrics = calculateDashboardMetrics(sampleApplications, sampleInterviews)

      const totalAppMetric = metrics.find((m) => m.id === 'total-applications')
      const interviewMetric = metrics.find((m) => m.id === 'interviews')
      const offerMetric = metrics.find((m) => m.id === 'offers')
      const responseRateMetric = metrics.find((m) => m.id === 'response-rate')

      // Total count includes all tracked applications (6 total: 5 submitted + 1 saved)
      assert.ok(totalAppMetric)
      assert.equal(totalAppMetric.value, 6)

      // Interviews card counts applications in Interview stage (1: Stripe)
      assert.ok(interviewMetric)
      assert.equal(interviewMetric.value, 1)

      // Offers card counts applications in Offer stage (1: Figma)
      assert.ok(offerMetric)
      assert.equal(offerMetric.value, 1)

      // Response rate: 5 submitted (excluding 1 Saved).
      // Responded: Screening (Linear), Interview (Stripe), Offer (Figma), Rejected (Vercel) = 4 responded.
      // Rate = (4 / 5) * 100% = 80%
      assert.ok(responseRateMetric)
      assert.equal(responseRateMetric.value, '80%')
      assert.equal(responseRateMetric.description, '4 of 5 responded')
    })
  })

  describe('2. Removal of hardcoded trend values & fabricated comparisons', () => {
    test('does not return any previously hardcoded trend strings in calculated metrics', () => {
      const metrics = calculateDashboardMetrics(sampleApplications, sampleInterviews)

      for (const metric of metrics) {
        // Assert old hardcoded strings are completely gone
        assert.notEqual(metric.change, '+6 this week', `Must not contain '+6 this week' in ${metric.id}`)
        assert.notEqual(metric.change, '+2 scheduled', `Must not contain '+2 scheduled' in ${metric.id}`)
        assert.notEqual(metric.change, '1 awaiting decision', `Must not contain '1 awaiting decision' in ${metric.id}`)
        assert.notEqual(metric.change, '+4.1% vs last month', `Must not contain '+4.1% vs last month' in ${metric.id}`)

        // Assert no fabricated positive/negative percentage change
        if (metric.change) {
          assert.equal(
            /^[+-]\d+(\.\d+)?%/.test(metric.change),
            false,
            `Must not fabricate trend percentage: "${metric.change}"`
          )
        }
      }
    })

    test('mockData.ts initialMetrics no longer contains hardcoded trend comparisons', () => {
      for (const metric of initialMetrics) {
        assert.notEqual(metric.change, '+6 this week')
        assert.notEqual(metric.change, '+2 scheduled')
        assert.notEqual(metric.change, '1 awaiting decision')
        assert.notEqual(metric.change, '+4.1% vs last month')
        assert.equal(metric.trend, 'neutral')
      }
    })

    test('App.tsx source derives metrics dynamically instead of copying hardcoded trend values', () => {
      const appSource = fs.readFileSync(
        path.resolve(import.meta.dirname, '../src/App.tsx'),
        'utf-8'
      )

      assert.ok(
        appSource.includes('calculateDashboardMetrics('),
        'Expected App.tsx to use calculateDashboardMetrics'
      )
      assert.equal(
        appSource.includes('import { initialMetrics } from'),
        false,
        'App.tsx must not import initialMetrics'
      )
    })
  })

  describe('3. Missing historical data produces a neutral state', () => {
    test('returns neutral trend indicator and truthful neutral explanation', () => {
      const metrics = calculateDashboardMetrics(sampleApplications, sampleInterviews)

      for (const metric of metrics) {
        assert.equal(
          metric.trend,
          'neutral',
          `Metric "${metric.id}" must have neutral trend without historical comparison data`
        )
        assert.equal(
          metric.change,
          'Trend data not available yet',
          `Metric "${metric.id}" must state trend data is not available yet`
        )
      }
    })
  })

  describe('4. Empty data and zero denominators safety', () => {
    test('handles empty applications array without crashing or producing NaN/Infinity', () => {
      const metrics = calculateDashboardMetrics([])

      const totalAppMetric = metrics.find((m) => m.id === 'total-applications')
      const interviewMetric = metrics.find((m) => m.id === 'interviews')
      const offerMetric = metrics.find((m) => m.id === 'offers')
      const responseRateMetric = metrics.find((m) => m.id === 'response-rate')

      assert.equal(totalAppMetric?.value, 0)
      assert.equal(interviewMetric?.value, 0)
      assert.equal(offerMetric?.value, 0)

      // Crucial: 0 submitted applications must yield '0%' and NOT NaN%, Infinity%, or error
      assert.equal(responseRateMetric?.value, '0%')
      assert.equal(responseRateMetric?.description, 'No submitted applications')
      assert.equal(responseRateMetric?.trend, 'neutral')
    })

    test('handles array containing only Saved applications without zero division error', () => {
      const savedOnly: JobApplication[] = [
        {
          id: 'app-draft-1',
          company: 'Acme Draft',
          role: 'Junior Engineer',
          appliedDate: '',
          status: 'Saved',
          workplaceType: 'Remote',
        },
        {
          id: 'app-draft-2',
          company: 'Beta Draft',
          role: 'Designer',
          appliedDate: '',
          status: 'Saved',
          workplaceType: 'Remote',
        },
      ]

      const metrics = calculateDashboardMetrics(savedOnly)
      const totalAppMetric = metrics.find((m) => m.id === 'total-applications')
      const responseRateMetric = metrics.find((m) => m.id === 'response-rate')

      assert.equal(totalAppMetric?.value, 2)
      assert.equal(responseRateMetric?.value, '0%')
      assert.equal(responseRateMetric?.description, 'No submitted applications')
    })

    test('handles undefined or malformed input safely without throwing exceptions', () => {
      // @ts-expect-error Testing runtime resilience against non-array input
      const metricsNull = calculateDashboardMetrics(null)
      assert.equal(metricsNull.length, 4)
      assert.equal(metricsNull[0].value, 0)

      // @ts-expect-error Testing runtime resilience against undefined
      const metricsUndef = calculateDashboardMetrics(undefined)
      assert.equal(metricsUndef.length, 4)
      assert.equal(metricsUndef[0].value, 0)
    })
  })

  describe('5. Metrics user scoping & isolation', () => {
    test('metrics strictly scope calculation to supplied user applications without cross-user leakage', () => {
      const userA_Apps: (JobApplication & { userId?: string })[] = [
        {
          id: 'app-user-a-1',
          company: 'Company A',
          role: 'Software Engineer',
          appliedDate: '2026-10-10',
          status: 'Interview',
          workplaceType: 'Remote',
          userId: 'user-a',
        },
      ]

      const userB_Apps: (JobApplication & { userId?: string })[] = [
        {
          id: 'app-user-b-1',
          company: 'Company B',
          role: 'DevOps Engineer',
          appliedDate: '2026-10-11',
          status: 'Offer',
          workplaceType: 'Hybrid',
          userId: 'user-b',
        },
        {
          id: 'app-user-b-2',
          company: 'Company C',
          role: 'Site Reliability Engineer',
          appliedDate: '2026-10-12',
          status: 'Applied',
          workplaceType: 'On-site',
          userId: 'user-b',
        },
      ]

      // User A calculates metrics
      const metricsA = calculateDashboardMetrics(userA_Apps)
      assert.equal(metricsA.find((m) => m.id === 'total-applications')?.value, 1)
      assert.equal(metricsA.find((m) => m.id === 'interviews')?.value, 1)
      assert.equal(metricsA.find((m) => m.id === 'offers')?.value, 0)

      // User B calculates metrics independently
      const metricsB = calculateDashboardMetrics(userB_Apps)
      assert.equal(metricsB.find((m) => m.id === 'total-applications')?.value, 2)
      assert.equal(metricsB.find((m) => m.id === 'interviews')?.value, 0)
      assert.equal(metricsB.find((m) => m.id === 'offers')?.value, 1)

      // Total applications of User A never bleed into User B
      assert.notEqual(
        metricsA.find((m) => m.id === 'total-applications')?.value,
        metricsB.find((m) => m.id === 'total-applications')?.value
      )
    })
  })
})
