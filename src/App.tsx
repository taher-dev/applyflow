import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Briefcase, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/useAuth'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MetricsGrid } from '@/components/dashboard/MetricsGrid'
import { RecentApplications } from '@/components/dashboard/RecentApplications'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { InterviewsPage } from '@/components/interviews/InterviewsPage'
import { ApplicationFormDialog } from '@/components/dashboard/AddApplicationDialog'
import { DeleteApplicationDialog } from '@/components/dashboard/DeleteApplicationDialog'
import { InterviewFormDialog } from '@/components/interviews/InterviewFormDialog'
import { DeleteInterviewDialog } from '@/components/interviews/DeleteInterviewDialog'
import { ResetDemoDataDialog } from '@/components/dashboard/ResetDemoDataDialog'
import { LocalDataMigrationBanner } from '@/components/dashboard/LocalDataMigrationBanner'
import { useApplyFlowStorage } from '@/lib/useApplyFlowStorage'
import { loadActiveTab, saveActiveTab } from '@/lib/storage'
import { ApiError } from '@/lib/api'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { initialMetrics } from '@/data/mockData'
import type {
  JobApplication,
  NavigationKey,
  MetricCardData,
  ApplicationStatus,
  Interview,
} from '@/types/dashboard'

function DashboardContent() {
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
    isLoadingApplications,
    applicationsError,
    refetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    interviews,
    setInterviews,
    resetToDemoData,
  } = useApplyFlowStorage()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isSavingApp, setIsSavingApp] = useState(false)
  const [isDeletingApp, setIsDeletingApp] = useState(false)
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

  const handleSaveApplication = async (
    appData: Omit<JobApplication, 'id'>,
    existingId?: string
  ) => {
    if (isSavingApp) return
    setIsSavingApp(true)
    try {
      if (existingId) {
        await updateApplication(existingId, appData)
        toast.success('Application updated!', {
          description: `${appData.role} at ${appData.company} has been saved.`,
        })
      } else {
        await createApplication(appData)
        toast.success('Application tracked successfully!', {
          description: `${appData.role} at ${appData.company} has been added to your pipeline.`,
        })
      }
      setApplicationToEdit(null)
      setIsFormDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save application'
      toast.error('Failed to save application', { description: msg })
    } finally {
      setIsSavingApp(false)
    }
  }

  // Quick Status Update
  const handleUpdateStatus = async (id: string, newStatus: ApplicationStatus) => {
    const target = applications.find((a) => a.id === id)
    if (!target || target.status === newStatus) return

    try {
      await updateApplication(id, { status: newStatus })
      toast.info('Status updated', {
        description: `${target.company} is now marked as ${newStatus}.`,
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update status'
      toast.error('Status update failed', { description: msg })
    }
  }

  // Application Delete Action Handlers (with cascade interview cleanup)
  const handleOpenDelete = (app: JobApplication) => {
    setApplicationToDelete(app)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async (id: string) => {
    if (isDeletingApp) return
    const target = applications.find((a) => a.id === id)
    setIsDeletingApp(true)
    try {
      await deleteApplication(id)
      // Cascade deletion: Remove any local interviews associated with this deleted application
      setInterviews((prev) => prev.filter((interview) => interview.applicationId !== id))
      setApplicationToDelete(null)
      setIsDeleteDialogOpen(false)

      if (target) {
        toast.success('Application deleted', {
          description: `${target.role} at ${target.company} was removed from your pipeline.`,
        })
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete application'
      toast.error('Delete failed', { description: msg })
    } finally {
      setIsDeletingApp(false)
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Left Minimal White Sidebar */}
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
          {/* 0. Optional Legacy Local Storage Migration Banner */}
          <LocalDataMigrationBanner onImportComplete={refetchApplications} />

          {/* Error Banner when server communication fails */}
          {applicationsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-rose-600 shrink-0" />
                <span>{applicationsError}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchApplications()}
                className="h-7 text-xs border-rose-300 hover:bg-white text-rose-900 cursor-pointer shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Indicator while synchronizing with database */}
          {isLoadingApplications && applications.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-center gap-2.5 text-xs text-slate-500">
              <Loader2 className="size-4 animate-spin text-slate-800" />
              <span>Loading applications from cloud database...</span>
            </div>
          )}

          {/* Welcome Heading, View Switcher & Action Button */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 min-w-0">
            <div className="space-y-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {activeTab === 'overview' && 'My Applications'}
                {activeTab === 'pipeline' && 'Kanban Board'}
                {activeTab === 'interviews' && 'Interview Management'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {activeTab === 'overview' && 'Track and manage your job applications'}
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

            <div className="flex items-center gap-2.5 shrink-0">
              {activeTab === 'interviews' ? (
                <Button
                  onClick={() => handleOpenScheduleInterview()}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs gap-2 shrink-0 cursor-pointer h-9 px-4 rounded-lg font-medium"
                >
                  <Plus className="size-4" />
                  <span>Schedule interview</span>
                </Button>
              ) : (
                <Button
                  onClick={handleOpenAdd}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs gap-2 shrink-0 cursor-pointer h-9 px-4 rounded-lg font-medium"
                >
                  <Plus className="size-4" />
                  <span>Add application</span>
                </Button>
              )}
            </div>
          </section>

          {/* 4 Metric Cards - Displayed only on Overview screen */}
          {activeTab === 'overview' && <MetricsGrid metrics={metrics} />}

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
            <div className="w-full min-w-0">
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

function AppRoot() {
  const { user, isLoading } = useAuth()

  // 1. Initial loading splash while verifying cookie-backed session
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 text-slate-900 space-y-4 font-sans">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md ring-4 ring-slate-100">
          <Briefcase className="size-7" />
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Loader2 className="size-4 animate-spin text-slate-900" />
          <span>Restoring session...</span>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated state: Render login and registration screen
  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  // 3. Authenticated state: Render full ApplyFlow workspace
  return <DashboardContent />
}

export function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  )
}

export default App

