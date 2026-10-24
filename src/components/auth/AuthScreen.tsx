import React, { useState } from 'react'
import {
  Briefcase,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/useAuth'
import { ApiError } from '@/lib/api'
import { toast } from 'sonner'

type AuthMode = 'login' | 'register'

interface AuthScreenProps {
  initialMode?: AuthMode
  enableDemoAuth?: boolean
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
    Boolean(import.meta.env?.DEV) &&
    import.meta.env?.VITE_ENABLE_DEMO_AUTH !== 'false',
}: AuthScreenProps = {}) {
  const { login, register, loginWithGoogle, error: contextError, clearError } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Form input states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setLocalError(null)
    setFieldErrors({})
    setShowPassword(false)
    clearError()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (mode === 'register' && !name.trim()) {
      errors.name = 'Please enter your full name'
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Please enter your password'
    } else if (mode === 'register' && password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
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
      } else {
        await register({ name: name.trim(), email: email.trim(), password })
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
    setIsGoogleSubmitting(true)
    try {
      await loginWithGoogle()
      toast.success('Signed in with demo Google account!')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Demo sign-in could not be completed'
      setLocalError(msg)
      toast.error(msg)
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  const handleForgotPassword = () => {
    if (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.info(`Password reset link sent to ${email.trim()}`)
    } else {
      toast.info('Enter your email address above to receive a password reset link.')
    }
  }

  const activeError = localError || contextError

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-white px-4 py-8 sm:px-6 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        {/* Minimal Brand Mark */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="size-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm mb-4">
            <Briefcase className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'Sign in to access your application workspace'
              : 'Start tracking job applications and interviews'}
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

        {/* Google SSO / Demo Auth Button */}
        {enableDemoAuth ? (
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-sm transition-colors duration-150 shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Continue with Demo Google"
          >
            {isGoogleSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin text-slate-500" />
                <span>Signing in to Demo Account...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="size-4.5" />
                <span>Continue with Demo Google</span>
                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">Demo</Badge>
              </>
            )}
          </button>
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
              <Badge variant="outline" className="text-[10px] font-normal text-slate-400 border-slate-200 px-1.5 py-0">Unavailable</Badge>
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
                  onClick={handleForgotPassword}
                  className="text-xs font-normal text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
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

        {/* Minimal Mode Toggle */}
        <div className="text-center text-xs text-slate-500 mt-6">
          {mode === 'login' ? (
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
