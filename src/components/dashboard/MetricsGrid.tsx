import type { MetricCardData } from '@/types/dashboard'
import { MetricCard } from '@/components/dashboard/MetricCard'

interface MetricsGridProps {
  metrics: MetricCardData[]
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  )
}
