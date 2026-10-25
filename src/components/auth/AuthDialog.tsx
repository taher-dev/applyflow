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
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-[410px] p-4 sm:px-6 sm:py-5 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain bg-white border-slate-200 rounded-2xl shadow-xl [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(203,213,225,0.8)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
        <AuthScreen isDialog onClose={() => onOpenChange(false)} initialMode={initialMode} />
      </DialogContent>
    </Dialog>
  )
}
