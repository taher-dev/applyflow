import { Briefcase, Calendar, Award, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { MetricCardData } from '@/types/dashboard'

interface MetricCardProps {
  metric: MetricCardData
}

const iconComponents = {
  briefcase: Briefcase,
  calendar: Calendar,
  award: Award,
  'trending-up': TrendingUp,
}

export function MetricCard({ metric }: MetricCardProps) {
  const Icon = iconComponents[metric.iconName] || Briefcase

  // Only render a trend badge if there is actual trend data (not neutral placeholder text)
  const hasActiveTrend =
    metric.trend &&
    metric.trend !== 'neutral' &&
    metric.change &&
    metric.change !== 'Trend data not available yet'

  const trendColorClass =
    metric.trend === 'positive'
      ? 'text-emerald-700 bg-emerald-50'
      : metric.trend === 'negative'
      ? 'text-rose-700 bg-rose-50'
      : 'text-slate-600 bg-slate-100'

  // Contextual secondary detail: only display if meaningful (e.g., "4 of 5 responded", "2 upcoming rounds")
  // and omit redundant generic descriptions that clutter the minimal card.
  const hasInformativeDescription =
    Boolean(metric.description) &&
    metric.description !== 'Active job submissions' &&
    metric.description !== 'Formal employment offers' &&
    metric.description !== 'Across all active stages'

  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs hover:border-slate-300 transition-colors">
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-500 tracking-tight">
            {metric.title}
          </span>
          <Icon className="size-4 text-slate-400 shrink-0" />
        </div>

        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {metric.value}
          </div>
          <div className="mt-1 min-h-[18px] flex items-center">
            {hasActiveTrend && (
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium mr-1.5 shrink-0 ${trendColorClass}`}
              >
                {metric.change}
              </span>
            )}
            {hasInformativeDescription ? (
              <span className="text-xs text-slate-400 font-normal truncate">
                {metric.description}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
