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
import { RotateCcw } from 'lucide-react'

interface ResetDemoDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ResetDemoDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: ResetDemoDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <RotateCcw className="size-4" />
            </div>
            <AlertDialogTitle className="text-base font-semibold">
              Reset to Demonstration Data?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
            This will clear your local changes and restore the default sample job applications,
            pipeline stages, and interview schedules. Any custom records you have added or edited
            will be replaced.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
          <AlertDialogCancel className="cursor-pointer text-xs h-8">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="cursor-pointer bg-red-600 hover:bg-red-700 text-white text-xs h-8"
          >
            Reset Demo Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
