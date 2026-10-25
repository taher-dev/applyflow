import { createContext } from 'react'
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  loginWithGoogle: (payload?: { credential?: string; email?: string; name?: string }) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
