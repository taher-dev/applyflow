import React, { useState, useEffect, useRef } from 'react'
import {
  Briefcase,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Mail,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/useAuth'
import { ApiError } from '@/lib/api'
import { toast } from 'sonner'
import type { GoogleCredentialResponse } from '@/types/google'

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password'

interface AuthScreenProps {
  initialMode?: AuthMode
  enableDemoAuth?: boolean
  isDialog?: boolean
  onClose?: () => void
}

function GoogleIcon({ className = 'size-4.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function AuthScreen({
  initialMode = 'login',
  enableDemoAuth = typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_ENABLE_DEMO_AUTH !== 'false',
  isDialog = false,
  onClose,
}: AuthScreenProps = {}) {
  const {
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    confirmResetToken,
    resetPassword,
    error: contextError,
    clearError,
  } = useAuth()
  const [tokenFromUrl] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return (params.get('reset_token') || params.get('token') || '').trim()
  })

  const [mode, setMode] = useState<AuthMode>(() => {
    if (tokenFromUrl) return 'reset-password'
    return initialMode
  })

  const googleClientId =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID
      ? (import.meta.env.VITE_GOOGLE_CLIENT_ID as string).trim()
      : undefined

  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [isGoogleSdkReady, setIsGoogleSdkReady] = useState(false)

  // Form input states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState(() => tokenFromUrl)
  const [showPassword, setShowPassword] = useState(false)
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null)
  const [loginNotice, setLoginNotice] = useState<string | null>(null)

  // Token confirmation states (from email link)
  const [isConfirmingToken, setIsConfirmingToken] = useState(() => !!tokenFromUrl)
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null)
  const [tokenConfirmError, setTokenConfirmError] = useState<string | null>(null)

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Asynchronously verify token if present in URL
  useEffect(() => {
    if (!tokenFromUrl) return

    let isMounted = true

    confirmResetToken(tokenFromUrl)
      .then((res) => {
        if (!isMounted) return
        setConfirmedEmail(res.email || null)
        toast.success('Reset link confirmed! Please enter your new password.')
      })
      .catch((err) => {
        if (!isMounted) return
        const msg =
          err instanceof ApiError
            ? err.message
            : 'The password reset link is invalid, expired, or has already been used.'
        setTokenConfirmError(msg)
        toast.error(msg)
      })
      .finally(() => {
        if (!isMounted) return
        setIsConfirmingToken(false)
      })

    return () => {
      isMounted = false
    }
  }, [tokenFromUrl, confirmResetToken])

  // Initialize and mount Google Identity Services button if client ID is configured
  useEffect(() => {
    if (!googleClientId || mode === 'forgot-password' || mode === 'reset-password') {
      return
    }

    let isMounted = true

    const initAndRenderGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return false
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              toast.error('No credential received from Google')
              return
            }
            setLocalError(null)
            setIsGoogleSubmitting(true)
            try {
              await loginWithGoogle({ credential: response.credential })
              toast.success('Successfully signed in with Google!')
            } catch (err) {
              const msg =
                err instanceof ApiError
                  ? err.message
                  : 'Google authentication could not be completed'
              setLocalError(msg)
              toast.error(msg)
            } finally {
              if (isMounted) {
                setIsGoogleSubmitting(false)
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 380,
            logo_alignment: 'left',
          })
        }

        if (isMounted) {
          setIsGoogleSdkReady(true)
        }
        return true
      } catch (err) {
        console.error('Error initializing Google Identity Services:', err)
        return false
      }
    }

    if (initAndRenderGoogle()) {
      return () => {
        isMounted = false
      }
    }

    const intervalId = window.setInterval(() => {
      if (initAndRenderGoogle()) {
        window.clearInterval(intervalId)
      }
    }, 100)

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId)
    }, 4000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [googleClientId, mode, loginWithGoogle])

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setLocalError(null)
    setFieldErrors({})
    setShowPassword(false)
    setResetSuccessMessage(null)
    setTokenConfirmError(null)
    setLoginNotice(null)
    clearError()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (mode === 'register' && !name.trim()) {
      errors.name = 'Please enter your full name'
    }

    if (mode === 'login' || mode === 'register' || mode === 'forgot-password') {
      if (!email.trim()) {
        errors.email = 'Please enter your email address'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address'
      }
    }

    if (mode === 'login') {
      if (!password) {
        errors.password = 'Please enter your password'
      }
    }

    if (mode === 'register') {
      if (!password) {
        errors.password = 'Please enter your password'
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }
    }

    if (mode === 'reset-password') {
      if (!resetToken.trim()) {
        errors.resetToken = 'Please enter or paste your reset code'
      }
      if (!password) {
        errors.password = 'Please enter a new password'
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }
      if (confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password })
      } else if (mode === 'register') {
        await register({ name: name.trim(), email: email.trim(), password })
      } else if (mode === 'forgot-password') {
        const res = await forgotPassword(email.trim())
        if (res.resetToken) {
          setResetToken(res.resetToken)
        }
        setResetSuccessMessage(
          res.message || 'If an account exists with this email, a password reset link has been sent to your inbox.'
        )
        toast.success('Password reset link sent to your email!')
      } else if (mode === 'reset-password') {
        const res = await resetPassword({
          token: resetToken.trim(),
          newPassword: password,
        })

        // Clean token parameter from browser address bar
        try {
          const url = new URL(window.location.href)
          url.searchParams.delete('reset_token')
          url.searchParams.delete('token')
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
        } catch {
          // ignore if history API is restricted
        }

        // Redirect to login screen, pre-fill email, and notify user
        const targetEmail = confirmedEmail || res?.email || email
        setEmail(targetEmail)
        setPassword('')
        setConfirmPassword('')
        setResetToken('')
        setConfirmedEmail(null)
        setTokenConfirmError(null)
        setMode('login')
        setLoginNotice('Password successfully reset! Please sign in with your new password.')
        toast.success('Password reset successfully! Please sign in with your new password.')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setLocalError(err.message)
        if (err.details && typeof err.details === 'object') {
          const formattedDetails: Record<string, string> = {}
          for (const [key, val] of Object.entries(err.details as Record<string, unknown>)) {
            if (Array.isArray(val) && val.length > 0) {
              formattedDetails[key] = String(val[0])
            } else if (typeof val === 'string') {
              formattedDetails[key] = val
            }
          }
          setFieldErrors(formattedDetails)
        }
      } else {
        setLocalError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLocalError(null)

    if (googleClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast.info('Please click the Google button directly to complete sign-in.')
        }
      })
      return
    }

    if (enableDemoAuth) {
      setIsGoogleSubmitting(true)
      try {
        await loginWithGoogle()
        toast.success('Signed in with Demo Google account!')
        if (!googleClientId) {
          toast.info(
            'Running with Demo profile. Add VITE_GOOGLE_CLIENT_ID to connect your live Google account.',
            { duration: 5000 }
          )
        }
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Demo sign-in could not be completed'
        setLocalError(msg)
        toast.error(msg)
      } finally {
        setIsGoogleSubmitting(false)
      }
    }
  }

  const activeError = localError || contextError

  return (
    <div
      className={
        isDialog
          ? 'w-full flex flex-col items-center font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 py-1'
          : 'min-h-screen w-full flex flex-col justify-center items-center bg-white px-4 py-8 sm:px-6 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900'
      }
    >
      <div className="w-full max-w-[380px] flex flex-col items-center">
        {/* Minimal Brand Mark */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="size-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm mb-4">
            {mode === 'forgot-password' ? (
              <Mail className="size-5" />
            ) : mode === 'reset-password' ? (
              <KeyRound className="size-5" />
            ) : (
              <Briefcase className="size-5" />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
              ? 'Create an account'
              : mode === 'forgot-password'
              ? resetSuccessMessage
                ? 'Check your email'
                : 'Reset your password'
              : 'Set new password'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-[320px]">
            {mode === 'login'
              ? 'Sign in to access your application workspace'
              : mode === 'register'
              ? 'Start tracking job applications and interviews'
              : mode === 'forgot-password'
              ? resetSuccessMessage
                ? 'We sent a confirmation link to your inbox'
                : 'Enter your account email to receive a reset link'
              : confirmedEmail
              ? `Choose a new password for ${confirmedEmail}`
              : 'Choose a new secure password for your account'}
          </p>
        </div>

        {/* Global Error Banner */}
        {activeError && (
          <div
            role="alert"
            className="w-full mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-700 animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeError}</div>
          </div>
        )}

        {/* Success / Status Banner (e.g. after password reset) */}
        {loginNotice && mode === 'login' && !activeError && (
          <div
            role="status"
            className="w-full mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{loginNotice}</div>
          </div>
        )}

        {/* --- FORGOT PASSWORD MODE --- */}
        {mode === 'forgot-password' && (
          <div className="w-full">
            {resetSuccessMessage ? (
              <div className="w-full space-y-5 animate-in fade-in duration-200 text-center">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 space-y-3 shadow-xs">
                  <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                    <Mail className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">We sent a reset link to</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">{email}</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    Click the link in the email to set a new password. If you don't see it within a couple minutes, please check your spam folder.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full h-10.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs cursor-pointer transition-colors"
                  >
                    Back to sign in
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetSuccessMessage(null)
                    }}
                    className="w-full text-xs text-slate-500 hover:text-slate-900 py-1 transition-colors cursor-pointer text-center"
                  >
                    Didn't receive the email? <span className="font-medium text-slate-900 underline">Try again</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    disabled={isSubmitting}
                    className="h-10.5 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    autoComplete="email"
                    autoFocus
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="text-[11px] font-medium text-red-600">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors duration-150 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Sending reset link...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Send reset link</span>
                      <ArrowRight className="size-4" />
                    </div>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    &larr; Return to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- RESET PASSWORD MODE --- */}
        {mode === 'reset-password' && (
          <div className="w-full">
            {isConfirmingToken ? (
              <div className="w-full py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="size-6 animate-spin text-slate-700" />
                <p className="text-sm text-slate-600 font-medium">Confirming password reset link...</p>
              </div>
            ) : tokenConfirmError ? (
              <div className="w-full space-y-4 animate-in fade-in duration-200">
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-xs text-red-700 space-y-2"
                >
                  <div className="flex items-center gap-2 font-semibold text-red-900">
                    <AlertCircle className="size-4 text-red-600 shrink-0" />
                    <span>Invalid or Expired Link</span>
                  </div>
                  <p className="leading-relaxed">{tokenConfirmError}</p>
                </div>

                <Button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="w-full h-10.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs cursor-pointer"
                >
                  Request a new reset link
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => switchMode('login')}
                  className="w-full h-10 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Return to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
                {/* Confirmation banner if token was verified from email link */}
                {confirmedEmail && (
                  <div
                    role="status"
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <span>Confirmed request for <strong>{confirmedEmail}</strong></span>
                    </div>
                  </div>
                )}

                {/* Reset Code (only show if not prefilled/confirmed from email URL) */}
                {!confirmedEmail && (
                  <div className="space-y-1.5">
                    <Label htmlFor="resetToken" className="text-xs font-medium text-slate-700">
                      Reset code / token
                    </Label>
                    <Input
                      id="resetToken"
                      name="resetToken"
                      type="text"
                      placeholder="Paste your reset code"
                      value={resetToken}
                      onChange={(e) => {
                        setResetToken(e.target.value)
                        if (fieldErrors.resetToken) setFieldErrors((prev) => ({ ...prev, resetToken: '' }))
                      }}
                      disabled={isSubmitting}
                      className="h-10.5 font-mono text-xs rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                      aria-invalid={!!fieldErrors.resetToken}
                      aria-describedby={fieldErrors.resetToken ? 'resetToken-error' : undefined}
                      autoFocus={!resetToken}
                    />
                    {fieldErrors.resetToken && (
                      <p id="resetToken-error" className="text-[11px] font-medium text-red-600">
                        {fieldErrors.resetToken}
                      </p>
                    )}
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                      New password
                    </Label>
                    <span className="text-[11px] text-slate-400">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                      }}
                      disabled={isSubmitting}
                      className="h-10.5 pr-10 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      autoComplete="new-password"
                      autoFocus={!!confirmedEmail}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="password-error" className="text-[11px] font-medium text-red-600">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    disabled={isSubmitting}
                    className="h-10.5 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <p id="confirmPassword-error" className="text-[11px] font-medium text-red-600">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors duration-150 cursor-pointer active:scale-[0.99] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Updating password...</span>
                    </div>
                  ) : (
                    <span>Update password</span>
                  )}
                </Button>

                <div className="flex items-center justify-center text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Cancel and return to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- LOGIN AND REGISTER MODES --- */}
        {(mode === 'login' || mode === 'register') && (
          <>
            {/* Google SSO / OAuth / Demo Auth */}
            {googleClientId ? (
              <div className="w-full flex flex-col items-center">
                <div
                  ref={googleButtonRef}
                  className={`w-full flex justify-center min-h-[44px] ${
                    isGoogleSubmitting ? 'opacity-40 pointer-events-none' : ''
                  }`}
                />
                {isGoogleSubmitting && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 animate-pulse">
                    <Loader2 className="size-3.5 animate-spin text-blue-600" />
                    <span>Verifying Google account...</span>
                  </div>
                )}
                {!isGoogleSdkReady && !isGoogleSubmitting && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors duration-150 shadow-xs cursor-pointer active:scale-[0.99]"
                    aria-label="Continue with Google"
                  >
                    <GoogleIcon className="size-4.5" />
                    <span>Continue with Google</span>
                  </button>
                )}
              </div>
            ) : enableDemoAuth ? (
              <div className="w-full space-y-1.5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-sm transition-colors duration-150 shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Continue with Google"
                >
                  {isGoogleSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-slate-500" />
                      <span>Signing in with Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="size-4.5" />
                      <span>Continue with Google</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0"
                      >
                        Demo
                      </Badge>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Configure <code className="font-mono text-slate-500">VITE_GOOGLE_CLIENT_ID</code> for live Google OAuth.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-1.5">
                <button
                  type="button"
                  disabled
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 font-medium text-sm cursor-not-allowed select-none shadow-xs"
                  aria-label="Google Sign-In unavailable"
                  title="Google authentication is not configured in this environment"
                >
                  <GoogleIcon className="size-4.5 opacity-40 grayscale" />
                  <span>Continue with Google</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal text-slate-400 border-slate-200 px-1.5 py-0"
                  >
                    Unavailable
                  </Badge>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Google OAuth is not configured in this environment.
                </p>
              </div>
            )}

            {/* Minimal Divider */}
            <div className="relative w-full my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                  or
                </span>
              </div>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
              {/* Full Name (Register mode only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-700">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="h-10.5 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    autoComplete="name"
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="text-[11px] font-medium text-red-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                  }}
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="h-10.5 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p id="email-error" className="text-[11px] font-medium text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                    Password
                  </Label>
                  {mode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="text-xs font-normal text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      Forgot password?
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Min. 8 characters</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="h-10.5 pr-10 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 transition-colors"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-[11px] font-medium text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Primary Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full h-10.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors duration-150 cursor-pointer active:scale-[0.99] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-white" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </div>
                ) : (
                  <span>{mode === 'login' ? 'Sign in with email' : 'Create account'}</span>
                )}
              </Button>
            </form>
          </>
        )}

        {/* Minimal Mode Toggle */}
        <div className="text-center text-xs text-slate-500 mt-6">
          {mode === 'forgot-password' || mode === 'reset-password' ? (
            resetSuccessMessage ? null : (
              <span>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-slate-900 hover:underline transition-all cursor-pointer ml-0.5"
                >
                  Sign in
                </button>
              </span>
            )
          ) : mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                disabled={isSubmitting || isGoogleSubmitting}
                className="font-medium text-slate-900 hover:underline transition-all cursor-pointer ml-0.5"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                disabled={isSubmitting || isGoogleSubmitting}
                className="font-medium text-slate-900 hover:underline transition-all cursor-pointer ml-0.5"
              >
                Sign in
              </button>
            </span>
          )}
        </div>

        {/* Minimal Footer Note */}
        <p className="text-[11px] text-slate-400 text-center mt-8 leading-relaxed max-w-[320px]">
          By continuing, you agree to ApplyFlow's{' '}
          <span className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  )
}
