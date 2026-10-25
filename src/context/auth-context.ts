import { createContext } from 'react'
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  loginWithGoogle: (payload?: { credential?: string; email?: string; name?: string }) => Promise<void>
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string; resetUrl?: string }>
  confirmResetToken: (token: string) => Promise<{ valid: boolean; email?: string; name?: string; message: string }>
  resetPassword: (payload: { token: string; newPassword: string }) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
