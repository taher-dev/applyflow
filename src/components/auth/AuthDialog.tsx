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
      <DialogContent className="sm:max-w-[440px] p-6 max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <AuthScreen isDialog onClose={() => onOpenChange(false)} initialMode={initialMode} />
      </DialogContent>
    </Dialog>
  )
}
