import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AuthScreen } from './AuthScreen'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: 'login' | 'register' | 'forgot-password' | 'reset-password'
}

export function AuthDialog({ open, onOpenChange, initialMode }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-[420px] p-4 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain bg-white border-slate-200 rounded-2xl shadow-xl">
        <AuthScreen isDialog onClose={() => onOpenChange(false)} initialMode={initialMode} />
      </DialogContent>
    </Dialog>
  )
}
