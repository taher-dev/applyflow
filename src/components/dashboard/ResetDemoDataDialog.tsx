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
import { RotateCcw, Info } from 'lucide-react'

interface ResetDemoDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  isRefreshing?: boolean
}

export function ResetDemoDataDialog({
  open,
  onOpenChange,
  onConfirm,
  isRefreshing = false,
}: ResetDemoDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[440px] p-5 sm:p-6 rounded-2xl border-slate-200/90 shadow-xl bg-white gap-5">
        <AlertDialogHeader className="p-0 text-left">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-700 mt-0.5 shadow-2xs">
              <RotateCcw className={`size-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <AlertDialogTitle className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-snug">
                Refresh workspace data?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                This will reload your latest job applications and interviews from the cloud database. Your saved applications and interviews will not be deleted or replaced.
              </AlertDialogDescription>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                <Info className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Demo data reset is disabled for database-backed accounts to protect your real applications and interviews from being overwritten or lost.
                </span>
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="p-0 m-0 bg-transparent border-t-0 flex-row justify-end gap-2.5 pt-1">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            disabled={isRefreshing}
            className="h-9 px-4 text-xs sm:text-sm font-medium border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer rounded-lg m-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isRefreshing}
            className="h-9 px-4 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 active:bg-slate-950 active:scale-95 text-white shadow-xs transition-all cursor-pointer rounded-lg m-0"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ResetDemoDataDialog as RefreshWorkspaceDialog }

