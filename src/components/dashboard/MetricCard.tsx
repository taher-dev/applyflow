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
      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
      : metric.trend === 'negative'
      ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
      : 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300'

  return (
    <Card className="border border-border/80 bg-card shadow-2xs hover:shadow-xs transition-shadow">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className="text-xs font-medium text-muted-foreground tracking-wide truncate min-w-0 flex-1"
            title={metric.title}
          >
            {metric.title}
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Icon className="size-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {metric.value}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${trendColorClass}`}
            >
              {metric.change}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {metric.description}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
