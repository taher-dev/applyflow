import React, { useState, useMemo } from 'react'
import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
import { PIPELINE_COLUMNS } from './kanbanTypes'
import { KanbanColumn } from './KanbanColumn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, X, GitPullRequest, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface KanbanBoardProps {
  applications: JobApplication[]
  onEditApplication: (application: JobApplication) => void
  onDeleteApplication: (application: JobApplication) => void
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void
  onAddNew: () => void
}

export function KanbanBoard({
  applications,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
  onAddNew,
}: KanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null)
  const [activeDropStatus, setActiveDropStatus] = useState<ApplicationStatus | null>(null)
  const [mobileColumnFilter, setMobileColumnFilter] = useState<ApplicationStatus | 'ALL'>('ALL')

  // Search filter across pipeline cards
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications
    const query = searchQuery.trim().toLowerCase()
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        (app.location && app.location.toLowerCase().includes(query))
    )
  }, [applications, searchQuery])

  // Status counts map for header badges
  const statusCounts = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      Saved: 0,
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    }
    applications.forEach((app) => {
      counts[app.status] = (counts[app.status] || 0) + 1
    })
    return counts
  }, [applications])

  // Drag and Drop Event Handlers (HTML5 native API, React 19 safe)
  const handleCardDragStart = (_e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedAppId(id)
  }

  const handleCardDragEnd = () => {
    setDraggedAppId(null)
    setActiveDropStatus(null)
  }

  const handleColumnDragOver = (
    _e: React.DragEvent<HTMLDivElement>,
    status: ApplicationStatus
  ) => {
    if (activeDropStatus !== status) {
      setActiveDropStatus(status)
    }
  }

  const handleColumnDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if actually leaving column bounds
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setActiveDropStatus(null)
    }
  }

  const handleColumnDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetStatus: ApplicationStatus
  ) => {
    e.preventDefault()
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId
    setDraggedAppId(null)
    setActiveDropStatus(null)

    if (!appId) return

    const targetApp = applications.find((app) => app.id === appId)
    if (!targetApp) return

    if (targetApp.status === targetStatus) return

    // Update shared state
    onUpdateStatus(appId, targetStatus)
    toast.success(`Stage updated to ${targetStatus}`, {
      description: `${targetApp.role} at ${targetApp.company} moved to ${targetStatus}.`,
    })
  }

  // Filter columns on mobile if a specific column is selected
  const visibleColumns = useMemo(() => {
    if (mobileColumnFilter === 'ALL') return PIPELINE_COLUMNS
    return PIPELINE_COLUMNS.filter((col) => col.status === mobileColumnFilter)
  }, [mobileColumnFilter])

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
                <GitPullRequest className="size-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Job Application Pipeline
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag and drop candidate cards across workflow stages, or use keyboard arrows to advance.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={onAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5 text-xs sm:text-sm h-9 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add application</span>
            </Button>
          </div>
        </div>

        {/* Search bar & quick filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search pipeline cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-8 h-9 text-xs sm:text-sm bg-background border-border/80 focus-visible:ring-1"
              aria-label="Search pipeline cards by company name or role"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                aria-label="Clear pipeline search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Pipeline Stage Quick Counters */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            {PIPELINE_COLUMNS.map((col) => (
              <span
                key={col.status}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/60 text-[11px]"
              >
                <span className={cn('size-2 rounded-full', col.dotClass)} />
                <span className="font-medium text-foreground">{col.label}:</span>
                <span className="font-semibold">{statusCounts[col.status]}</span>
              </span>
            ))}
          </div>

          {/* Mobile Column Quick Pill Selector */}
          <div className="flex lg:hidden overflow-x-auto gap-1.5 pb-1 text-xs">
            <Button
              variant={mobileColumnFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileColumnFilter('ALL')}
              className="h-7 text-xs px-2.5 rounded-full"
            >
              All Columns
            </Button>
            {PIPELINE_COLUMNS.map((col) => (
              <Button
                key={col.status}
                variant={mobileColumnFilter === col.status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMobileColumnFilter(col.status)}
                className="h-7 text-xs px-2.5 rounded-full shrink-0 flex items-center gap-1.5"
              >
                <span className={cn('size-1.5 rounded-full', col.dotClass)} />
                <span>{col.label}</span>
                <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4">
                  {statusCounts[col.status]}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Search match indicator */}
        {searchQuery && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border/60">
            <span>
              Showing <span className="font-semibold text-foreground">{filteredApplications.length}</span> cards matching &quot;{searchQuery}&quot;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Clear filter</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Horizontal Kanban Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start w-full min-w-0 snap-x">
        {visibleColumns.map((col) => {
          const colApps = filteredApplications.filter((app) => app.status === col.status)

          return (
            <div key={col.status} className="snap-start shrink-0">
              <KanbanColumn
                column={col}
                applications={colApps}
                isDragOver={activeDropStatus === col.status}
                draggedAppId={draggedAppId}
                onDragOver={handleColumnDragOver}
                onDragLeave={handleColumnDragLeave}
                onDrop={handleColumnDrop}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                onEdit={onEditApplication}
                onDelete={onDeleteApplication}
                onUpdateStatus={onUpdateStatus}
                onAddNew={onAddNew}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
