import React from 'react'
import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
import type { ColumnDefinition, KanbanCategory } from './kanbanTypes'
import { KanbanCard } from './KanbanCard'
import { Badge } from '@/components/ui/badge'
import { Inbox, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface KanbanColumnProps {
  column: ColumnDefinition
  applications: JobApplication[]
  isDragOver: boolean
  draggedAppId: string | null
  onDragOver: (e: React.DragEvent<HTMLDivElement>, columnId: KanbanCategory) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: ColumnDefinition) => void
  onCardDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onCardDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
  onEdit: (application: JobApplication) => void
  onDelete: (application: JobApplication) => void
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void
  onAddNew?: () => void
  onSelect?: (application: JobApplication) => void
  onScheduleInterview?: (applicationId: string) => void
}

export function KanbanColumn({
  column,
  applications,
  isDragOver,
  draggedAppId,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddNew,
  onSelect,
  onScheduleInterview,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(e, column.id)
  }

  return (
    <div
      role="region"
      aria-label={`${column.label} column, ${applications.length} applications`}
      className="flex flex-col w-[290px] sm:w-[310px] xl:w-auto shrink-0 rounded-xl bg-slate-100/70 border border-slate-200/80 shadow-xs"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('size-2.5 rounded-full shrink-0', column.dotClass)} />
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            {column.label}
          </h3>
          <Badge
            variant="outline"
            className={cn('text-[11px] font-semibold px-2 py-0 h-5 rounded-full', column.badgeClass)}
          >
            {applications.length}
          </Badge>
        </div>

        {/* Quick add button in Applied column if available */}
        {onAddNew && column.id === 'Applied' && (
          <button
            type="button"
            onClick={onAddNew}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-white/80 transition-colors cursor-pointer"
            aria-label={`Add new application to ${column.label}`}
            title={`Add new application`}
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {/* Column description subheader */}
      <div className="px-3.5 py-1.5 text-[11px] text-slate-500 border-b border-slate-200/60 bg-white/60">
        {column.description}
      </div>

      {/* Cards Scrollable Drop Zone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, column)}
        className={cn(
          'flex-1 p-2.5 space-y-2.5 min-h-[360px] max-h-[calc(100vh-280px)] overflow-y-auto transition-colors duration-150',
          isDragOver && column.activeDropClass
        )}
      >
        {/* Active Drop Ghost Highlight Indicator */}
        {isDragOver && (
          <div className="border-2 border-dashed border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/40 rounded-lg p-3 text-center text-xs font-medium text-blue-600 dark:text-blue-300 animate-pulse">
            Drop here to move to {column.label}
          </div>
        )}

        {/* Render Application Cards */}
        {applications.length > 0 ? (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              isDragging={draggedAppId === app.id}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateStatus={onUpdateStatus}
              onSelect={onSelect}
              onScheduleInterview={onScheduleInterview}
            />
          ))
        ) : (
          /* Empty Column Placeholder */
          !isDragOver && (
            <div className="h-44 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center p-4 text-center text-muted-foreground/80">
              <div className="size-8 rounded-full bg-background flex items-center justify-center text-muted-foreground/60 mb-2 shadow-2xs">
                <Inbox className="size-4" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                No {column.label.toLowerCase()} applications
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Drag cards here or update status
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
