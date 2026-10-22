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

  const trendColorClass =
    metric.trend === 'positive'
      ? 'text-emerald-700 bg-emerald-50'
      : metric.trend === 'negative'
      ? 'text-rose-700 bg-rose-50'
      : 'text-slate-700 bg-slate-100'

  return (
    <Card className="border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow rounded-xl">
      <CardContent className="p-3.5 sm:p-5 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          <span
            className="text-[11px] sm:text-xs font-semibold text-slate-500 tracking-wide min-w-0 flex-1 leading-snug"
            title={metric.title}
          >
            {metric.title}
          </span>
          <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <Icon className="size-3.5 sm:size-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {metric.value}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold shrink-0 ${trendColorClass}`}
            >
              {metric.change}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
              {metric.description}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
