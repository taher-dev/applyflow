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
      <AlertDialogContent className="sm:max-w-[420px] p-5 sm:p-6 rounded-2xl border-slate-200/90 shadow-xl bg-white gap-5">
        <AlertDialogHeader className="p-0 text-left">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-600 mt-0.5 shadow-2xs">
              <Trash2 className="size-4.5" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <AlertDialogTitle className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-snug">
                Delete application?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                This will permanently delete your application for{' '}
                <span className="font-semibold text-slate-900">{application.role}</span> at{' '}
                <span className="font-semibold text-slate-900">{application.company}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="p-0 m-0 bg-transparent border-t-0 flex-row justify-end gap-2.5 pt-1">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs sm:text-sm font-medium border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer rounded-lg m-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="h-9 px-4 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 text-white shadow-xs transition-all cursor-pointer rounded-lg m-0"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

