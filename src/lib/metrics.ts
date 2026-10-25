import type { JobApplication, Interview, MetricCardData } from '@/types/dashboard'

export interface CalculateMetricsOptions {
  currentTimestamp?: number
}

/**
 * Calculates honest, data-driven dashboard metrics derived strictly from the
 * user's authentic applications and interviews.
 *
 * Does not invent historical snapshot data or display fabricated trend percentages.
 * When historical comparison data is unavailable, returns a neutral state.
 */
export function calculateDashboardMetrics(
  applications: JobApplication[] = [],
  interviews: Interview[] = [],
  options?: CalculateMetricsOptions
): MetricCardData[] {
  // Safe normalization of input array
  const safeApps = Array.isArray(applications) ? applications : []
  const safeInterviews = Array.isArray(interviews) ? interviews : []
  const now = options?.currentTimestamp ?? Date.now()

  // 1. Total Applications (all tracked applications for the user)
  const totalCount = safeApps.length

  // 2. Applications currently in Interview stage
  const interviewCount = safeApps.filter((a) => a && a.status === 'Interview').length

  // 3. Applications currently in Offer stage
  const offerCount = safeApps.filter((a) => a && a.status === 'Offer').length

  // 4. Response Rate:
  // Submitted applications: all applications submitted to employer (excluding drafts with 'Saved' status)
  const submittedCount = safeApps.filter((a) => a && a.status !== 'Saved').length

  // Responded applications: employer responded with Screening, Interview, Offer, or Rejected
  const respondedCount = safeApps.filter(
    (a) =>
      a &&
      (a.status === 'Screening' ||
        a.status === 'Interview' ||
        a.status === 'Offer' ||
        a.status === 'Rejected')
  ).length

  // Safe division: guard against zero denominators and ensure no NaN / Infinity
  let responseRateFormatted = '0%'
  if (submittedCount > 0 && !isNaN(submittedCount) && isFinite(submittedCount)) {
    const rawRate = (respondedCount / submittedCount) * 100
    if (!isNaN(rawRate) && isFinite(rawRate)) {
      // Round to 1 decimal place, e.g. 23.6%
      const rounded = Math.round(rawRate * 10) / 10
      responseRateFormatted = `${rounded}%`
    }
  }

  // Count upcoming scheduled rounds from authentic interviews data
  const upcomingRoundsCount = safeInterviews.filter((item) => {
    if (!item?.scheduledAt) return false
    const time = new Date(item.scheduledAt).getTime()
    return !isNaN(time) && time >= now
  }).length

  const interviewsDescription =
    upcomingRoundsCount > 0
      ? `${upcomingRoundsCount} upcoming round${upcomingRoundsCount === 1 ? '' : 's'}`
      : 'Across all active stages'

  // Descriptions: honest, truthful, and informative
  const responseDescription =
    submittedCount > 0
      ? `${respondedCount} of ${submittedCount} responded`
      : 'No submitted applications'

  return [
    {
      id: 'total-applications',
      title: 'Total Applications',
      value: totalCount,
      change: 'Trend data not available yet',
      trend: 'neutral',
      description: 'Active job submissions',
      iconName: 'briefcase',
    },
    {
      id: 'interviews',
      title: 'Interviews',
      value: interviewCount,
      change: 'Trend data not available yet',
      trend: 'neutral',
      description: interviewsDescription,
      iconName: 'calendar',
    },
    {
      id: 'offers',
      title: 'Offers',
      value: offerCount,
      change: 'Trend data not available yet',
      trend: 'neutral',
      description: 'Formal employment offers',
      iconName: 'award',
    },
    {
      id: 'response-rate',
      title: 'Response Rate',
      value: responseRateFormatted,
      change: 'Trend data not available yet',
      trend: 'neutral',
      description: responseDescription,
      iconName: 'trending-up',
    },
  ]
}
