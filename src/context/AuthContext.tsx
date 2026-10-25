import React, { useState, useEffect, useCallback } from 'react'
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth'
import { api, ApiError } from '@/lib/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isGuest, setIsGuest] = useState<boolean>(true)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return Boolean(params.get('reset_token') || params.get('token'))
  })
  const [error, setError] = useState<string | null>(null)

  // Verify cookie-backed session on initial mount
  // If no session → guest mode (not an error, it's the default state)
  useEffect(() => {
    let isSubscribed = true

    async function restoreSession() {
      try {
        const currentUser = await api.auth.getMe()
        if (isSubscribed) {
          setUser(currentUser)
          setIsGuest(false)
          setError(null)
        }
      } catch (err) {
        // 401 Unauthorized simply indicates no active session → guest mode
        if (isSubscribed) {
          setUser(null)
          setIsGuest(true)
          // Do not flag expected 401 as an application error on initial load
          if (err instanceof ApiError && err.status !== 401) {
            setError(err.message)
          }
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isSubscribed = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    try {
      const authenticatedUser = await api.auth.login(credentials)
      setUser(authenticatedUser)
      setIsGuest(false)
      setIsAuthDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed'
      setError(msg)
      throw err
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setError(null)
    try {
      const registeredUser = await api.auth.register(credentials)
      setUser(registeredUser)
      setIsGuest(false)
      setIsAuthDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed'
      setError(msg)
      throw err
    }
  }, [])

  const loginWithGoogle = useCallback(async (payload?: { credential?: string; email?: string; name?: string }) => {
    setError(null)
    try {
      const googleUser = await api.auth.googleLogin(payload)
      setUser(googleUser)
      setIsGuest(false)
      setIsAuthDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Google sign-in failed'
      setError(msg)
      throw err
    }
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      return await api.auth.forgotPassword(email)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Password reset request failed'
      setError(msg)
      throw err
    }
  }, [])

  const confirmResetToken = useCallback(async (token: string) => {
    setError(null)
    try {
      return await api.auth.confirmResetToken(token)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Password reset confirmation failed'
      setError(msg)
      throw err
    }
  }, [])

  const resetPassword = useCallback(async (payload: { token: string; newPassword: string }) => {
    setError(null)
    try {
      return await api.auth.resetPassword(payload)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Password reset failed'
      setError(msg)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
      setIsGuest(true)
      setError(null)
    }
  }, [])

  const openAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(true)
  }, [])

  const closeAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(false)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    user,
    isLoading,
    isGuest,
    isAuthDialogOpen,
    error,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    confirmResetToken,
    resetPassword,
    logout,
    openAuthDialog,
    closeAuthDialog,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
