import type { MetricCardData } from '@/types/dashboard'
import { MetricCard } from '@/components/dashboard/MetricCard'

interface MetricsGridProps {
  metrics: MetricCardData[]
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  )
}
