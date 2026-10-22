import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Interview, JobApplication } from '@/types/dashboard'
import { Trash2, Calendar, Clock } from 'lucide-react'

interface DeleteInterviewDialogProps {
  interview: Interview | null
  application?: JobApplication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: (id: string) => void
}

export function DeleteInterviewDialog({
  interview,
  application,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteInterviewDialogProps) {
  if (!interview) return null

  const handleDelete = () => {
    onConfirmDelete(interview.id)
  }

  const interviewDate = new Date(interview.scheduledAt)
  const formattedDate = !isNaN(interviewDate.getTime())
    ? interviewDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : interview.scheduledAt

  const formattedTime = !isNaN(interviewDate.getTime())
    ? interviewDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

  const companyName = application?.company || 'this company'
  const roleName = application?.role || 'Job Opportunity'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="size-4.5" />
            </div>
            <AlertDialogTitle className="text-lg">Cancel & Delete Interview</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
            Are you sure you want to delete the{' '}
            <strong className="text-foreground">{interview.interviewType}</strong> for{' '}
            <strong className="text-foreground">{roleName}</strong> at{' '}
            <strong className="text-foreground">{companyName}</strong>?
          </AlertDialogDescription>

          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-slate-500">
            <div className="flex items-center gap-2 text-slate-900 font-medium">
              <Calendar className="size-3.5 text-slate-700 shrink-0" />
              <span>{formattedDate}</span>
              {formattedTime && (
                <>
                  <span className="text-slate-300">•</span>
                  <Clock className="size-3.5 text-slate-400 shrink-0" />
                  <span>{formattedTime}</span>
                </>
              )}
            </div>
            {interview.notes && (
              <p className="line-clamp-2 text-slate-500 italic pt-1 border-t border-slate-200/60">
                &quot;{interview.notes}&quot;
              </p>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Keep Interview
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
          >
            Delete Interview
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
