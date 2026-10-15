import React from 'react'
import type { JobApplication, ApplicationStatus } from '@/types/dashboard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  MapPin,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react'
import {
  STAGE_ORDER,
  getNextStatus,
  getPreviousStatus,
} from './kanbanTypes'
import { cn } from '@/lib/utils'

export interface KanbanCardProps {
  application: JobApplication
  isDragging?: boolean
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
  onEdit: (application: JobApplication) => void
  onDelete: (application: JobApplication) => void
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void
}

export function KanbanCard({
  application,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onUpdateStatus,
}: KanbanCardProps) {
  const previousStatus = getPreviousStatus(application.status)
  const nextStatus = getNextStatus(application.status)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', application.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(e, application.id)
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      aria-grabbed={isDragging}
      tabIndex={0}
      className={cn(
        'group relative p-3.5 border border-border/80 bg-card rounded-lg transition-all duration-150',
        'hover:shadow-md hover:border-border cursor-grab active:cursor-grabbing select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isDragging && 'opacity-40 scale-[0.98] border-dashed border-blue-500 shadow-none'
      )}
    >
      {/* Top row: Monogram avatar, Company, Role, Drag grip, and Action Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Company Monogram Badge */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300 mt-0.5">
            {application.company.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere] leading-snug">
              {application.company}
            </h4>
            <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] leading-snug mt-0.5">
              {application.role}
            </p>
          </div>
        </div>

        {/* Action controls & grip */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
          <GripVertical className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Actions for ${application.company}`}
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onEdit(application)}
                className="cursor-pointer text-xs"
              >
                <Pencil className="size-3.5 mr-2" />
                <span>Edit Application</span>
              </DropdownMenuItem>

              {/* Move to another stage (keyboard-accessible submenu) */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer text-xs">
                  <ArrowRightLeft className="size-3.5 mr-2" />
                  <span>Move Stage</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {STAGE_ORDER.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      disabled={stage === application.status}
                      onClick={() => onUpdateStatus(application.id, stage)}
                      className="cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span>{stage}</span>
                      {stage === application.status && (
                        <Check className="size-3 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDelete(application)}
                className="text-destructive focus:text-destructive cursor-pointer text-xs"
              >
                <Trash2 className="size-3.5 mr-2" />
                <span>Delete Application</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Location and Salary Details */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted-foreground mt-2.5 pt-2 border-t border-border/50">
        <div className="flex items-start gap-1 min-w-0 flex-1">
          <MapPin className="size-3 shrink-0 text-muted-foreground/70 mt-0.5" />
          <span className="break-words [overflow-wrap:anywhere] leading-tight">
            {application.location || 'Not specified'}
          </span>
        </div>

        {application.salary && (
          <span className="flex items-center text-[10px] font-semibold text-foreground shrink-0 ml-auto">
            <DollarSign className="size-2.5 text-muted-foreground mr-0.5" />
            {application.salary}
          </span>
        )}
      </div>

      {/* Meta Chips: Arrangement & Employment Type at the bottom of Location */}
      <div className="flex items-center justify-between gap-1.5 mt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="text-[10px] font-normal px-1.5 py-0 rounded border border-border/60 bg-muted/70 text-muted-foreground"
          >
            {application.workplaceType}
          </Badge>
          {application.employmentType && (
            <Badge
              variant="secondary"
              className="text-[10px] font-normal px-1.5 py-0 rounded border border-border/60 bg-muted/70 text-muted-foreground"
            >
              {application.employmentType}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <Calendar className="size-3 text-muted-foreground/70" />
          <span>
            {new Date(application.appliedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Quick Stage Shifter buttons (Accessible keyboard & touch step navigation) */}
      <div className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          disabled={!previousStatus}
          onClick={(e) => {
            e.stopPropagation()
            if (previousStatus) onUpdateStatus(application.id, previousStatus)
          }}
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed gap-0.5"
          title={previousStatus ? `Move back to ${previousStatus}` : 'At initial stage'}
          aria-label={`Move ${application.company} back to ${previousStatus || 'initial stage'}`}
        >
          <ChevronLeft className="size-3" />
          <span>{previousStatus ? previousStatus : 'Start'}</span>
        </Button>

        <span className="text-[10px] text-muted-foreground/40 font-mono">/</span>

        <Button
          variant="ghost"
          size="sm"
          disabled={!nextStatus}
          onClick={(e) => {
            e.stopPropagation()
            if (nextStatus) onUpdateStatus(application.id, nextStatus)
          }}
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed gap-0.5"
          title={nextStatus ? `Advance to ${nextStatus}` : 'At final stage'}
          aria-label={`Advance ${application.company} to ${nextStatus || 'final stage'}`}
        >
          <span>{nextStatus ? nextStatus : 'Done'}</span>
          <ChevronRight className="size-3" />
        </Button>
      </div>
    </Card>
  )
}
