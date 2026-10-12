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
import type { JobApplication } from '@/types/dashboard'
import { Trash2 } from 'lucide-react'

interface DeleteApplicationDialogProps {
  application: JobApplication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: (id: string) => void
}

export function DeleteApplicationDialog({
  application,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteApplicationDialogProps) {
  if (!application) return null

  const handleDelete = () => {
    onConfirmDelete(application.id)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="size-4.5" />
            </div>
            <AlertDialogTitle className="text-lg">Delete Job Application</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
            Are you sure you want to delete the application for{' '}
            <strong className="text-foreground">{application.role}</strong> at{' '}
            <strong className="text-foreground">{application.company}</strong>?
            This will permanently remove it from your pipeline and recalculate your dashboard metrics.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
          >
            Delete Application
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
