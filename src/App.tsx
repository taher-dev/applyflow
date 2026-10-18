import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, LayoutDashboard, GitPullRequest, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { RecentApplications } from '@/components/dashboard/RecentApplications'
import { UpcomingInterviews } from '@/components/dashboard/UpcomingInterviews'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { InterviewsPage } from '@/components/interviews/InterviewsPage'
import { ApplicationFormDialog } from '@/components/dashboard/AddApplicationDialog'
import { DeleteApplicationDialog } from '@/components/dashboard/DeleteApplicationDialog'
import { InterviewFormDialog } from '@/components/interviews/InterviewFormDialog'
import { DeleteInterviewDialog } from '@/components/interviews/DeleteInterviewDialog'
import { ResetDemoDataDialog } from '@/components/dashboard/ResetDemoDataDialog'
import { useApplyFlowStorage } from '@/lib/useApplyFlowStorage'
import { loadActiveTab, saveActiveTab } from '@/lib/storage'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { initialMetrics } from '@/data/mockData'
import type {
  JobApplication,
  NavigationKey,
  MetricCardData,
  ApplicationStatus,
  Interview,
} from '@/types/dashboard'

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationKey>(() => loadActiveTab())

  // Persist active navigation tab across browser refreshes
  useEffect(() => {
    saveActiveTab(activeTab)
  }, [activeTab])

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQueries, setSearchQueries] = useState<Partial<Record<NavigationKey, string>>>({
    overview: '',
    pipeline: '',
    interviews: '',
  })

  const currentSearchQuery = searchQueries[activeTab] || ''

  const setSearchQueryForTab = (tab: NavigationKey, query: string) => {
    setSearchQueries((prev) => ({
      ...prev,
      [tab]: query,
    }))
  }

  // Application dialog & selection state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [applicationToEdit, setApplicationToEdit] = useState<JobApplication | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [applicationToDelete, setApplicationToDelete] = useState<JobApplication | null>(null)

  // Interview dialog & selection state
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false)
  const [interviewToEdit, setInterviewToEdit] = useState<Interview | null>(null)
  const [preselectedAppId, setPreselectedAppId] = useState<string | null>(null)
  const [isDeleteInterviewDialogOpen, setIsDeleteInterviewDialogOpen] = useState(false)
  const [interviewToDelete, setInterviewToDelete] = useState<Interview | null>(null)

  // Single source of truth for persistent applications & interviews state
  const {
    applications,
    setApplications,
    interviews,
    setInterviews,
    resetToDemoData,
  } = useApplyFlowStorage()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [currentTime] = useState(() => Date.now())

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

  // Count of upcoming/future interviews for dynamic dashboard and sidebar badge
  const upcomingInterviewsCount = useMemo(() => {
    return interviews.filter((item) => {
      const time = new Date(item.scheduledAt).getTime()
      return !isNaN(time) && time >= currentTime
    }).length
  }, [interviews, currentTime])

  // Handlers for Add & Edit Application Dialog
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

  // Application Delete Action Handlers (with cascade interview cleanup)
  const handleOpenDelete = (app: JobApplication) => {
    setApplicationToDelete(app)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = (id: string) => {
    const target = applications.find((a) => a.id === id)
    setApplications((prev) => prev.filter((app) => app.id !== id))

    // Cascade deletion: Remove any interviews associated with this deleted application
    // to prevent orphaned/broken references in the interview schedule
    setInterviews((prev) => prev.filter((interview) => interview.applicationId !== id))

    setApplicationToDelete(null)
    setIsDeleteDialogOpen(false)

    if (target) {
      toast.success('Application deleted', {
        description: `${target.role} at ${target.company} was removed from your pipeline.`,
      })
    }
  }

  // Handlers for Interview Scheduling & Editing
  const handleOpenScheduleInterview = (preselectedAppIdParam?: string) => {
    setInterviewToEdit(null)
    setPreselectedAppId(preselectedAppIdParam || null)
    setIsInterviewDialogOpen(true)
  }

  const handleOpenEditInterview = (interview: Interview) => {
    setInterviewToEdit(interview)
    setPreselectedAppId(null)
    setIsInterviewDialogOpen(true)
  }

  const handleSaveInterview = (
    data: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const app = applications.find((a) => a.id === data.applicationId)
    const companyName = app?.company || 'opportunity'

    if (existingId) {
      // Immutable update of existing interview
      setInterviews((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      toast.success('Interview rescheduled!', {
        description: `${data.interviewType} with ${companyName} has been updated.`,
      })
    } else {
      // Immutable creation of new interview
      const nowIso = new Date().toISOString()
      const created: Interview = {
        ...data,
        id: `int-${Date.now()}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      setInterviews((prev) => [created, ...prev])
      toast.success('Interview scheduled!', {
        description: `${data.interviewType} with ${companyName} added to calendar.`,
      })
    }

    setInterviewToEdit(null)
    setPreselectedAppId(null)
    setIsInterviewDialogOpen(false)
  }

  // Interview Delete Handlers
  const handleOpenDeleteInterview = (interview: Interview) => {
    setInterviewToDelete(interview)
    setIsDeleteInterviewDialogOpen(true)
  }

  const handleConfirmDeleteInterview = (id: string) => {
    const target = interviews.find((i) => i.id === id)
    setInterviews((prev) => prev.filter((item) => item.id !== id))
    setInterviewToDelete(null)
    setIsDeleteInterviewDialogOpen(false)

    if (target) {
      toast.success('Interview removed', {
        description: `${target.interviewType} round has been cancelled.`,
      })
    }
  }

  // Screen-specific search target IDs and scroll containers
  const screenSearchConfig: Partial<Record<NavigationKey, { containerId: string; inputId: string }>> = {
    overview: {
      containerId: 'applications-directory',
      inputId: 'directory-search-input',
    },
    pipeline: {
      containerId: 'pipeline-board-container',
      inputId: 'pipeline-search-input',
    },
    interviews: {
      containerId: 'interviews-list-container',
      inputId: 'interviews-search-input',
    },
  }

  // Helper to focus the search bar in the active screen and place cursor at the end
  const focusScreenSearchInput = (screen: NavigationKey) => {
    const config = screenSearchConfig[screen]
    if (!config) return
    const input = document.getElementById(config.inputId) as HTMLInputElement | null
    if (input) {
      input.focus({ preventScroll: true })
      const len = input.value.length
      input.setSelectionRange(len, len)
    }
  }

  // Smooth scroll to search results on the currently active screen
  const scrollToSearchResults = (force = false) => {
    const config = screenSearchConfig[activeTab]
    if (!config) return

    setTimeout(() => {
      const el = document.getElementById(config.containerId)
      if (el) {
        const rect = el.getBoundingClientRect()
        const shouldScroll = force || rect.top > 200 || rect.top < 60

        if (shouldScroll) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Focus the search bar below once the smooth scroll animation completes
          setTimeout(() => {
            focusScreenSearchInput(activeTab)
          }, 450)
        } else {
          // Already in view, focus the search bar below immediately
          focusScreenSearchInput(activeTab)
        }
      }
    }, 60)
  }

  // Ref to hold the debounce timeout for scrolling after typing in navbar
  const searchScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchScrollTimeoutRef.current) {
        clearTimeout(searchScrollTimeoutRef.current)
      }
    }
  }, [])

  const handleNavbarSearchChange = (query: string) => {
    setSearchQueryForTab(activeTab, query)

    // Clear any existing scroll timeout so we only scroll after user pauses typing
    if (searchScrollTimeoutRef.current) {
      clearTimeout(searchScrollTimeoutRef.current)
    }

    if (query.trim().length > 0) {
      searchScrollTimeoutRef.current = setTimeout(() => {
        scrollToSearchResults(false)
      }, 500)
    }
  }

  const handleNavbarSearchSubmit = () => {
    // If user presses Enter or clicks search icon, scroll immediately without waiting for debounce
    if (searchScrollTimeoutRef.current) {
      clearTimeout(searchScrollTimeoutRef.current)
    }
    scrollToSearchResults(true)
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-background text-foreground font-sans">
      {/* 1. Left Dark Slate Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        upcomingInterviewsCount={upcomingInterviewsCount}
        onResetDemoData={() => setIsResetDialogOpen(true)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <Header
          searchQuery={currentSearchQuery}
          onSearchChange={handleNavbarSearchChange}
          onSearchSubmit={handleNavbarSearchSubmit}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          placeholder={
            activeTab === 'overview'
              ? 'Search applications...'
              : activeTab === 'pipeline'
              ? 'Search pipeline...'
              : 'Search interviews...'
          }
        />

        {/* Dashboard Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Welcome Heading, View Switcher & Action Button */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/40 min-w-0">
            <div className="space-y-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {activeTab === 'overview' && 'Welcome back, Alex'}
                {activeTab === 'pipeline' && 'Job Application Pipeline'}
                {activeTab === 'interviews' && 'Interview Management'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {activeTab === 'overview' && (
                  <>
                    You have{' '}
                    <span className="font-semibold text-foreground">
                      {upcomingInterviewsCount} upcoming interview{upcomingInterviewsCount === 1 ? '' : 's'}
                    </span>{' '}
                    scheduled across{' '}
                    <span className="font-semibold text-foreground">
                      {applications.length} active opportunities
                    </span>
                    .
                  </>
                )}
                {activeTab === 'pipeline' && (
                  <>
                    Drag and drop candidate cards across workflow stages, or update application statuses in real time.
                  </>
                )}
                {activeTab === 'interviews' && (
                  <>
                    Track upcoming conversations, manage interview rounds, and prepare effectively for each milestone.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* Quick View Switcher: Table View vs Pipeline Board vs Interviews */}
              <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'overview'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={activeTab === 'overview'}
                  aria-label="Switch to Table Overview"
                >
                  <LayoutDashboard className="size-3.5" />
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'pipeline'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={activeTab === 'pipeline'}
                  aria-label="Switch to Kanban Pipeline Board"
                >
                  <GitPullRequest className="size-3.5" />
                  <span>Pipeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('interviews')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'interviews'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={activeTab === 'interviews'}
                  aria-label="Switch to Interviews Calendar"
                >
                  <Calendar className="size-3.5" />
                  <span>Interviews</span>
                  {upcomingInterviewsCount > 0 && (
                    <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {upcomingInterviewsCount}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'interviews' ? (
                <Button
                  onClick={() => handleOpenScheduleInterview()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-2 shrink-0 cursor-pointer h-9 px-3.5"
                >
                  <Plus className="size-4" />
                  <span>Schedule interview</span>
                </Button>
              ) : (
                <Button
                  onClick={handleOpenAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-2 shrink-0 cursor-pointer h-9 px-3.5"
                >
                  <Plus className="size-4" />
                  <span>Add application</span>
                </Button>
              )}
            </div>
          </section>

          {/* 4 Metric Cards - Live derived from shared applications state */}
          {activeTab !== 'interviews' && <MetricsGrid metrics={metrics} />}

          {/* Dynamic View based on active navigation tab */}
          {activeTab === 'pipeline' && (
            <KanbanBoard
              applications={applications}
              searchQuery={searchQueries.pipeline || ''}
              onSearchChange={(q) => setSearchQueryForTab('pipeline', q)}
              onEditApplication={handleOpenEdit}
              onDeleteApplication={handleOpenDelete}
              onUpdateStatus={handleUpdateStatus}
              onAddNew={handleOpenAdd}
            />
          )}

          {activeTab === 'interviews' && (
            <InterviewsPage
              interviews={interviews}
              applications={applications}
              searchQuery={searchQueries.interviews || ''}
              onSearchChange={(q) => setSearchQueryForTab('interviews', q)}
              onScheduleInterview={handleOpenScheduleInterview}
              onEditInterview={handleOpenEditInterview}
              onDeleteInterview={handleOpenDeleteInterview}
              onNavigateToApplications={() => setActiveTab('overview')}
            />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6 w-full min-w-0">
              {/* Primary Application Directory - Full width, zero horizontal scroll */}
              <RecentApplications
                applications={applications}
                searchQuery={searchQueries.overview || ''}
                onSearchChange={(q) => setSearchQueryForTab('overview', q)}
                onClearSearch={() => setSearchQueryForTab('overview', '')}
                onAddNew={handleOpenAdd}
                onEditApplication={handleOpenEdit}
                onDeleteApplication={handleOpenDelete}
                onUpdateStatus={handleUpdateStatus}
              />

              {/* Upcoming Interviews - Structured below the main directory */}
              <div className="w-full min-w-0">
                <UpcomingInterviews
                  interviews={interviews}
                  applications={applications}
                  onScheduleInterview={handleOpenScheduleInterview}
                  onEditInterview={handleOpenEditInterview}
                  onDeleteInterview={handleOpenDeleteInterview}
                  onViewAllInterviews={() => setActiveTab('interviews')}
                />
              </div>
            </div>
          )}
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

      {/* 4. Delete Application Confirmation AlertDialog */}
      <DeleteApplicationDialog
        application={applicationToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setApplicationToDelete(null)
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* 5. Reusable Interview Form Dialog (Schedule & Edit) */}
      <InterviewFormDialog
        open={isInterviewDialogOpen}
        onOpenChange={(open) => {
          setIsInterviewDialogOpen(open)
          if (!open) {
            setInterviewToEdit(null)
            setPreselectedAppId(null)
          }
        }}
        applications={applications}
        interviewToEdit={interviewToEdit}
        preselectedApplicationId={preselectedAppId}
        onSaveInterview={handleSaveInterview}
        onOpenAddApplication={() => {
          setIsInterviewDialogOpen(false)
          handleOpenAdd()
        }}
      />

      {/* 6. Delete Interview Confirmation AlertDialog */}
      <DeleteInterviewDialog
        interview={interviewToDelete}
        application={
          interviewToDelete
            ? applications.find((a) => a.id === interviewToDelete.applicationId)
            : null
        }
        open={isDeleteInterviewDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteInterviewDialogOpen(open)
          if (!open) setInterviewToDelete(null)
        }}
        onConfirmDelete={handleConfirmDeleteInterview}
      />

      {/* 7. Reset Demonstration Data Confirmation Dialog */}
      <ResetDemoDataDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        onConfirm={() => {
          resetToDemoData()
          setActiveTab('overview')
          saveActiveTab('overview')
          setIsResetDialogOpen(false)
          toast.success('Demo data restored', {
            description: 'Sample applications and interviews have been restored.',
          })
        }}
      />

      {/* 8. Global Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  )
}

export default App

