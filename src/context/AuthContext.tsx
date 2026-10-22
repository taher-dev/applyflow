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
    setIsLoading(true)
    setError(null)
    try {
      const authenticatedUser = await api.auth.login(credentials)
      setUser(authenticatedUser)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const registeredUser = await api.auth.register(credentials)
      setUser(registeredUser)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(async (profile?: { email?: string; name?: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      const googleUser = await api.auth.googleLogin(profile)
      setUser(googleUser)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Google sign-in failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
      setError(null)
      setIsLoading(false)
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
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
