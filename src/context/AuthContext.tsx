import React, { useState, useEffect, useCallback } from 'react'
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth'
import { api, ApiError } from '@/lib/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Verify cookie-backed session on initial mount
  useEffect(() => {
    let isSubscribed = true

    async function restoreSession() {
      try {
        const currentUser = await api.auth.getMe()
        if (isSubscribed) {
          setUser(currentUser)
          setError(null)
        }
      } catch (err) {
        // 401 Unauthorized simply indicates no active session
        if (isSubscribed) {
          setUser(null)
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

  const resetPassword = useCallback(async (payload: { token: string; newPassword: string }) => {
    setError(null)
    try {
      const user = await api.auth.resetPassword(payload)
      setUser(user)
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
      setError(null)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
