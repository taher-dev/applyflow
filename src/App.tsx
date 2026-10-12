import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { RecentApplications } from '@/components/dashboard/RecentApplications'
import { UpcomingInterviews } from '@/components/dashboard/UpcomingInterviews'
import { AddApplicationDialog } from '@/components/dashboard/AddApplicationDialog'
import {
  initialApplications,
  initialInterviews,
  initialMetrics,
} from '@/data/mockData'
import type {
  JobApplication,
  NavigationKey,
  MetricCardData,
} from '@/types/dashboard'

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationKey>('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Application state (initialized with mock data)
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications)
  const [interviews] = useState(initialInterviews)

  // Derived metrics dynamically reflect changes
  const metrics = useMemo<MetricCardData[]>(() => {
    const totalCount = applications.length
    const interviewCount = applications.filter((a) => a.status === 'Interview').length
    const offerCount = applications.filter((a) => a.status === 'Offer').length

    return initialMetrics.map((metric) => {
      if (metric.id === 'total-applications') {
        return { ...metric, value: totalCount }
      }
      if (metric.id === 'interviews') {
        return { ...metric, value: interviewCount }
      }
      if (metric.id === 'offers') {
        return { ...metric, value: offerCount }
      }
      return metric
    })
  }, [applications])

  // Filter applications by search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications

    const query = searchQuery.toLowerCase().trim()
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        app.location.toLowerCase().includes(query)
    )
  }, [applications, searchQuery])

  // Handler to add a new job application
  const handleAddApplication = (
    newApp: Omit<JobApplication, 'id' | 'appliedDate'>
  ) => {
    const created: JobApplication = {
      ...newApp,
      id: `app-${Date.now()}`,
      appliedDate: new Date().toISOString().split('T')[0],
    }
    setApplications((prev) => [created, ...prev])
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-background text-foreground font-sans">
      {/* 1. Left Dark Slate Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <Header
          title="Career Overview"
          subtitle="Real-time pipeline monitoring & active opportunities"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Dashboard Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Welcome Heading & Add Action */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Welcome back, Alex
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You have <span className="font-semibold text-foreground">{interviews.length} interviews</span> scheduled this week across <span className="font-semibold text-foreground">{applications.length} active opportunities</span>.
              </p>
            </div>

            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add application</span>
            </Button>
          </section>

          {/* 4 Metric Cards */}
          <MetricsGrid metrics={metrics} />

          {/* Grid: Recent Applications Table + Upcoming Interviews */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full min-w-0">
            {/* Table takes 2 cols on desktop */}
            <div className="lg:col-span-2 w-full min-w-0">
              <RecentApplications
                applications={filteredApplications}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            </div>

            {/* Interviews panel takes 1 col on desktop */}
            <div className="lg:col-span-1 w-full min-w-0">
              <UpcomingInterviews interviews={interviews} />
            </div>
          </section>
        </main>
      </div>

      {/* 3. Add Application Dialog Form */}
      <AddApplicationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddApplication={handleAddApplication}
      />
    </div>
  )
}

export default App
