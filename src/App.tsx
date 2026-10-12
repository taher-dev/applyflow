import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { RecentApplications } from '@/components/dashboard/RecentApplications'
import { UpcomingInterviews } from '@/components/dashboard/UpcomingInterviews'
import { ApplicationFormDialog } from '@/components/dashboard/AddApplicationDialog'
import { DeleteApplicationDialog } from '@/components/dashboard/DeleteApplicationDialog'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  initialApplications,
  initialInterviews,
  initialMetrics,
} from '@/data/mockData'
import type {
  JobApplication,
  NavigationKey,
  MetricCardData,
  ApplicationStatus,
} from '@/types/dashboard'

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationKey>('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog & selection state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [applicationToEdit, setApplicationToEdit] = useState<JobApplication | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<JobApplication | null>(null)

  // Single source of truth for applications state
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications)
  const [interviews] = useState(initialInterviews)

  // Derived metrics dynamically calculated from live applications list
  const metrics = useMemo<MetricCardData[]>(() => {
    const totalCount = applications.length
    const interviewCount = applications.filter((a) => a.status === 'Interview').length
    const offerCount = applications.filter((a) => a.status === 'Offer').length

    // Submitted applications: all applications submitted to employer (excluding draft 'Saved')
    const submittedCount = applications.filter((a) => a.status !== 'Saved').length

    // Responded applications: employer responded with Screening, Interview, Offer, or Rejection
    const respondedCount = applications.filter(
      (a) =>
        a.status === 'Screening' ||
        a.status === 'Interview' ||
        a.status === 'Offer' ||
        a.status === 'Rejected'
    ).length

    const responseRate =
      submittedCount > 0
        ? `${Math.round((respondedCount / submittedCount) * 1000) / 10}%`
        : '0%'

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
      if (metric.id === 'response-rate') {
        return { ...metric, value: responseRate }
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
        (app.location && app.location.toLowerCase().includes(query))
    )
  }, [applications, searchQuery])

  // Handlers for Add & Edit Dialog
  const handleOpenAdd = () => {
    setApplicationToEdit(null)
    setIsFormDialogOpen(true)
  }

  const handleOpenEdit = (app: JobApplication) => {
    setApplicationToEdit(app)
    setIsFormDialogOpen(true)
  }

  const handleSaveApplication = (
    appData: Omit<JobApplication, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      // Immutable update of existing application
      setApplications((prev) =>
        prev.map((app) =>
          app.id === existingId
            ? {
                ...app,
                ...appData,
                id: existingId,
              }
            : app
        )
      )
      toast.success('Application updated!', {
        description: `${appData.role} at ${appData.company} has been saved.`,
      })
    } else {
      // Immutable creation of new application
      const created: JobApplication = {
        ...appData,
        id: `app-${Date.now()}`,
      }
      setApplications((prev) => [created, ...prev])
      toast.success('Application tracked successfully!', {
        description: `${appData.role} at ${appData.company} has been added to your pipeline.`,
      })
    }

    setApplicationToEdit(null)
    setIsFormDialogOpen(false)
  }

  // Quick Status Update
  const handleUpdateStatus = (id: string, newStatus: ApplicationStatus) => {
    const target = applications.find((a) => a.id === id)
    if (!target || target.status === newStatus) return

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    )

    toast.info('Status updated', {
      description: `${target.company} is now marked as ${newStatus}.`,
    })
  }

  // Delete Action Handlers
  const handleOpenDelete = (app: JobApplication) => {
    setApplicationToDelete(app)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = (id: string) => {
    const target = applications.find((a) => a.id === id)
    setApplications((prev) => prev.filter((app) => app.id !== id))
    setApplicationToDelete(null)
    setIsDeleteDialogOpen(false)

    if (target) {
      toast.success('Application deleted', {
        description: `${target.role} at ${target.company} was removed from your pipeline.`,
      })
    }
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
              onClick={handleOpenAdd}
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
                onAddNew={handleOpenAdd}
                onEditApplication={handleOpenEdit}
                onDeleteApplication={handleOpenDelete}
                onUpdateStatus={handleUpdateStatus}
              />
            </div>

            {/* Interviews panel takes 1 col on desktop */}
            <div className="lg:col-span-1 w-full min-w-0">
              <UpcomingInterviews interviews={interviews} />
            </div>
          </section>
        </main>
      </div>

      {/* 3. Reusable Application Form Dialog (Add & Edit) */}
      <ApplicationFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open)
          if (!open) setApplicationToEdit(null)
        }}
        applicationToEdit={applicationToEdit}
        onSaveApplication={handleSaveApplication}
      />

      {/* 4. Delete Confirmation AlertDialog */}
      <DeleteApplicationDialog
        application={applicationToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setApplicationToDelete(null)
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* 5. Global Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  )
}

export default App
