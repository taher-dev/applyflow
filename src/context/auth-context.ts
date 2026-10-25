import { createContext } from 'react'
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isGuest: boolean
  isAuthDialogOpen: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  loginWithGoogle: (payload?: { credential?: string; email?: string; name?: string }) => Promise<void>
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string; resetUrl?: string }>
  confirmResetToken: (token: string) => Promise<{ valid: boolean; email?: string; name?: string; message: string }>
  resetPassword: (payload: { token: string; newPassword: string }) => Promise<{ message: string; email?: string }>
  logout: () => Promise<void>
  openAuthDialog: () => void
  closeAuthDialog: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
