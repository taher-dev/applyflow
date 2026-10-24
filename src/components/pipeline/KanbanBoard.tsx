import React, { useState, useMemo } from 'react'
import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
import {
  PIPELINE_COLUMNS,
  type KanbanCategory,
  type ColumnDefinition,
} from './kanbanTypes'
import { KanbanColumn } from './KanbanColumn'
import { Input } from '@/components/ui/input'
import { Search, X, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface KanbanBoardProps {
  applications: JobApplication[]
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onEditApplication: (application: JobApplication) => void
  onDeleteApplication: (application: JobApplication) => void
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void
  onAddNew: () => void
  onSelectApplication?: (application: JobApplication) => void
  onScheduleInterview?: (applicationId: string) => void
}

export function KanbanBoard({
  applications,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
  onAddNew,
  onSelectApplication,
  onScheduleInterview,
}: KanbanBoardProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery

  const handleSearchChange = (val: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val)
    } else {
      setInternalSearchQuery(val)
    }
  }

  const [categoryFilter, setCategoryFilter] = useState<'all' | KanbanCategory>('all')
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null)
  const [activeDropCategory, setActiveDropCategory] = useState<KanbanCategory | null>(null)

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


  // Drag and Drop Event Handlers (HTML5 native API, React 19 safe)
  const handleCardDragStart = (_e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedAppId(id)
  }

  const handleCardDragEnd = () => {
    setDraggedAppId(null)
    setActiveDropCategory(null)
  }

  const handleColumnDragOver = (
    _e: React.DragEvent<HTMLDivElement>,
    columnId: KanbanCategory
  ) => {
    if (activeDropCategory !== columnId) {
      setActiveDropCategory(columnId)
    }
  }

  const handleColumnDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if actually leaving column bounds
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setActiveDropCategory(null)
    }
  }

  const handleColumnDrop = (
    e: React.DragEvent<HTMLDivElement>,
    column: ColumnDefinition
  ) => {
    e.preventDefault()
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId
    setDraggedAppId(null)
    setActiveDropCategory(null)

    if (!appId) return

    const targetApp = applications.find((app) => app.id === appId)
    if (!targetApp) return

    // If target app is already in this column's statuses, nothing to change
    if (column.statuses.includes(targetApp.status)) return

    // Update shared state
    onUpdateStatus(appId, column.dropStatus)
    toast.success(`Moved to ${column.label}`, {
      description: `${targetApp.role} at ${targetApp.company} moved to ${column.label}.`,
    })
  }

  // Filter columns based on categoryFilter pill selection
  const visibleColumns = useMemo(() => {
    if (categoryFilter === 'all') return PIPELINE_COLUMNS
    return PIPELINE_COLUMNS.filter((col) => col.id === categoryFilter)
  }, [categoryFilter])

  return (
    <div id="pipeline-board-container" className="space-y-4 w-full min-w-0 scroll-mt-20">
      {/* 1. Category Pill Tabs matching reference design */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Applications' },
          { id: 'Applied', label: 'Applied' },
          { id: 'Rejected', label: 'Rejected' },
          { id: 'Offer', label: 'Offer' },
        ].map((tab) => {
          const isActive = categoryFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id as 'all' | KanbanCategory)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer shrink-0 font-medium',
                isActive
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/90'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 2. Filter Toolbar */}
      <div className="flex flex-col gap-3.5 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              id="pipeline-search-input"
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8.5 pr-8 h-9 text-xs sm:text-sm bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900"
              aria-label="Search jobs by company name or role"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                aria-label="Clear pipeline search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search match indicator */}
        {searchQuery && (
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <span>
              Showing <span className="font-semibold text-slate-900">{filteredApplications.length}</span> cards matching &quot;{searchQuery}&quot;
            </span>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-slate-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Clear filter</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Responsive 3-Column Kanban Container */}
      <div
        className={cn(
          'pb-6 items-start w-full min-w-0',
          categoryFilter === 'all'
            ? 'flex gap-4.5 overflow-x-auto snap-x lg:grid lg:grid-cols-3 lg:overflow-x-visible'
            : 'flex justify-start'
        )}
      >
        {visibleColumns.map((col) => {
          const colApps = filteredApplications.filter((app) =>
            col.statuses.includes(app.status)
          )

          return (
            <div
              key={col.id}
              className={cn(
                'snap-start shrink-0',
                categoryFilter === 'all' ? 'lg:min-w-0' : 'w-full max-w-sm sm:max-w-md'
              )}
            >
              <KanbanColumn
                column={col}
                applications={colApps}
                isDragOver={activeDropCategory === col.id}
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
                onSelect={onSelectApplication}
                onScheduleInterview={onScheduleInterview}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
