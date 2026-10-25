import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Bell,
  Search,
  X,
  LogOut,
  User as UserIcon,
  Calendar,
  Clock,
  CalendarClock,
  ArrowRight,
  Plus,
  Briefcase,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/useAuth'
import { cn } from '@/lib/utils'
import type { Interview, JobApplication } from '@/types/dashboard'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleSidebar?: () => void
  onSearchSubmit?: () => void
  placeholder?: string
  interviews?: Interview[]
  applications?: JobApplication[]
  onSelectInterview?: (interview: Interview) => void
  onNavigateToInterviews?: () => void
  onScheduleInterview?: () => void
  onRefreshWorkspace?: () => void
  isVisible?: boolean
  unseenCount?: number
  onMarkNotificationsSeen?: () => void
  onLogoClick?: () => void
}

function getRelativeDateLabel(scheduledAt: string, currentTimestamp: number) {
  const target = new Date(scheduledAt).getTime()
  if (isNaN(target)) return ''

  const diffMs = target - currentTimestamp
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (diffHours > 0) return `In ${diffHours}h`
    if (diffHours < 0) return `${Math.abs(diffHours)}h ago`
    return 'Today'
  }
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1) return `In ${diffDays}d`
  return `${Math.abs(diffDays)}d ago`
}

function formatNotificationDate(scheduledAt: string) {
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return scheduledAt
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatNotificationTime(scheduledAt: string) {
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function Header({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  placeholder,
  interviews = [],
  applications = [],
  onSelectInterview,
  onNavigateToInterviews,
  onScheduleInterview,
  onRefreshWorkspace,
  isVisible = true,
  unseenCount,
  onMarkNotificationsSeen,
  onLogoClick,
}: HeaderProps) {
  const { user, logout } = useAuth()

  const [currentTime] = useState(() => Date.now())
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileInputRef.current?.focus()
    }
  }, [isMobileSearchOpen])

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false)
    if (searchQuery) {
      onSearchChange('')
    }
  }

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick()
    } else if (typeof window !== 'undefined' && window.location) {
      window.location.reload()
    }
  }

  const applicationMap = useMemo(() => {
    const map = new Map<string, JobApplication>()
    for (const app of applications) {
      map.set(app.id, app)
    }
    return map
  }, [applications])

  // Upcoming interviews sorted chronologically (soonest first)
  const upcomingInterviews = useMemo(() => {
    return interviews
      .filter((interview) => {
        const time = new Date(interview.scheduledAt).getTime()
        return !isNaN(time) && time >= currentTime
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [interviews, currentTime])

  const effectiveUnseenCount =
    unseenCount !== undefined ? unseenCount : upcomingInterviews.length

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AF'

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Handled inside AuthContext
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchSubmit?.()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md shadow-2xs gap-3 transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      {/* 1. Expanded Mobile Search View (takes full header when active) */}
      {isMobileSearchOpen ? (
        <div className="flex md:hidden items-center gap-2 w-full animate-in fade-in duration-150">
          <form onSubmit={handleSubmit} className="relative flex-1">
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 hover:text-slate-700 cursor-pointer p-0 bg-transparent border-0"
              aria-label="Search"
            >
              <Search className="size-4 pointer-events-none" />
            </button>
            <Input
              ref={mobileInputRef}
              type="text"
              placeholder={placeholder || 'Search...'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSearchSubmit?.()
                }
                if (e.key === 'Escape') {
                  setIsMobileSearchOpen(false)
                }
              }}
              className="w-full pl-8.5 pr-8 h-9 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 rounded-lg"
              aria-label={placeholder || 'Search'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-sm"
                aria-label="Clear header search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCloseMobileSearch}
            className="h-9 px-2.5 text-xs text-slate-600 hover:text-slate-900 shrink-0 font-medium cursor-pointer"
            aria-label="Cancel search"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          {/* Left: App Logo on mobile (desktop has logo in permanent sidebar) */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 shrink-0 md:hidden cursor-pointer hover:opacity-80 active:scale-95 transition-all bg-transparent border-0 p-0 text-left"
            aria-label="Refresh page"
            title="Refresh page"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <Briefcase className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              ApplyFlow
            </span>
          </button>

          {/* Center: Search Input on Desktop (hidden on mobile, visible on md+) */}
          <div className="hidden md:flex flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
            <form onSubmit={handleSubmit} className="relative w-full">
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 hover:text-slate-700 cursor-pointer p-0 bg-transparent border-0"
                aria-label="Search"
              >
                <Search className="size-4 pointer-events-none" />
              </button>
              <Input
                type="text"
                placeholder={placeholder || 'Search...'}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSearchSubmit?.()
                  }
                }}
                className="w-full pl-8.5 sm:pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900"
                aria-label={placeholder || 'Search'}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-sm"
                  aria-label="Clear header search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Right: Notifications + Minimized Mobile Search + Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Minimized Mobile Search Button Trigger (mobile only) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsMobileSearchOpen(true)}
              className="relative size-9 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 cursor-pointer md:hidden select-none shrink-0"
              aria-label="Open search"
            >
              <Search className="size-4" />
              {searchQuery && (
                <span className="absolute -top-1 -right-1 flex size-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
              )}
            </Button>

            {/* Interactive Interview Notifications Dropdown (Desktop Only - hidden on mobile) */}
            <div className="hidden md:block">
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) {
                onMarkNotificationsSeen?.()
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative size-9 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 cursor-pointer select-none hidden md:inline-flex"
                aria-label={
                  effectiveUnseenCount > 0
                    ? `${effectiveUnseenCount} upcoming interview notification${effectiveUnseenCount === 1 ? '' : 's'}`
                    : 'View interview notifications'
                }
              >
                <Bell className="size-4.5" />
                {effectiveUnseenCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-2xs ring-2 ring-white">
                    {effectiveUnseenCount > 9 ? '9+' : effectiveUnseenCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 sm:w-96 p-0 shadow-lg border border-slate-200/90 bg-white rounded-2xl overflow-hidden"
            >
              {/* Notification Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-2xs">
                    <Bell className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">Interview Notifications</h4>
                    <p className="text-[10px] text-slate-500 leading-none">Upcoming scheduled rounds</p>
                  </div>
                </div>

                {upcomingInterviews.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 font-medium"
                  >
                    {upcomingInterviews.length} upcoming
                  </Badge>
                )}
              </div>

              {/* Notification List Content */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                {upcomingInterviews.length === 0 ? (
                  <div className="py-7 px-4 text-center space-y-2.5">
                    <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
                      <CalendarClock className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900">No upcoming interviews</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-normal">
                        When interview rounds are scheduled, reminders and meeting details will notify you here.
                      </p>
                    </div>
                    {onScheduleInterview && (
                      <DropdownMenuItem asChild onSelect={() => onScheduleInterview()}>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg mt-1 cursor-pointer gap-1 mx-auto"
                        >
                          <Plus className="size-3" />
                          <span>Schedule an interview</span>
                        </Button>
                      </DropdownMenuItem>
                    )}
                  </div>
                ) : (
                  upcomingInterviews.slice(0, 5).map((interview) => {
                    const app = applicationMap.get(interview.applicationId)
                    const relativeLabel = getRelativeDateLabel(interview.scheduledAt, currentTime)
                    const dateStr = formatNotificationDate(interview.scheduledAt)
                    const timeStr = formatNotificationTime(interview.scheduledAt)
                    const isUrgent = relativeLabel === 'Today' || (relativeLabel.startsWith('In') && relativeLabel.includes('h'))

                    return (
                      <DropdownMenuItem
                        key={interview.id}
                        asChild
                        onSelect={() => {
                          if (onSelectInterview) {
                            onSelectInterview(interview)
                          } else if (onNavigateToInterviews) {
                            onNavigateToInterviews()
                          }
                        }}
                      >
                        <div className="p-3 hover:bg-slate-50 focus:bg-slate-50 transition-colors cursor-pointer rounded-xl flex items-start gap-3 text-left group w-full outline-hidden">
                          {/* Monogram */}
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 mt-0.5 group-hover:bg-slate-200/80 transition-colors">
                            {(app?.company || 'AP').slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="font-semibold text-xs text-slate-900 truncate">
                                {app?.company || 'Opportunity'}
                              </p>
                              {relativeLabel && (
                                <span
                                  className={cn(
                                    'text-[9px] font-medium px-1.5 py-0.5 rounded-md border shrink-0',
                                    isUrgent
                                      ? 'bg-amber-50 text-amber-800 border-amber-200/80 font-semibold'
                                      : 'bg-slate-100 text-slate-700 border-slate-200/80'
                                  )}
                                >
                                  {relativeLabel}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 truncate font-medium">
                              {app?.role || 'Interview Round'}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Calendar className="size-3 text-slate-400 shrink-0" />
                                {dateStr}
                              </span>
                              {timeStr && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-slate-400 shrink-0" />
                                  {timeStr}
                                </span>
                              )}
                            </div>

                            {interview.interviewer && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate pt-0.5">
                                <UserIcon className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">With {interview.interviewer}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>

              {/* Notification Footer Action */}
              {onNavigateToInterviews && (
                <div className="p-2 bg-slate-50/80 border-t border-slate-200/80">
                  <DropdownMenuItem asChild onSelect={() => onNavigateToInterviews()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-slate-900 hover:text-slate-900 font-medium justify-between h-8 px-3 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <span>View all interviews</span>
                      <ArrowRight className="size-3.5 text-slate-500" />
                    </Button>
                  </DropdownMenuItem>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Profile Avatar with Logout Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
              aria-label="User account menu"
            >
              <Avatar className="size-9 border border-slate-200 shrink-0 overflow-hidden">
                {user?.avatarUrl && (
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.name || 'User avatar'}
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback className="bg-slate-900 text-white font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-md border-slate-200 bg-white">
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8 border border-slate-200 shrink-0 overflow-hidden">
                  {user?.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.name || 'User avatar'}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback className="bg-slate-900 text-white font-semibold text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-none text-slate-900 truncate">
                    {user?.name || 'Account'}
                  </p>
                  <p className="text-xs leading-none text-slate-500 truncate">
                    {user?.email || ''}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            {onRefreshWorkspace && (
              <>
                <DropdownMenuItem
                  onClick={onRefreshWorkspace}
                  className="cursor-pointer gap-2 py-2 text-slate-700 focus:text-slate-900"
                >
                  <RotateCcw className="size-4 text-slate-500" />
                  <span>Refresh workspace data</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
              </>
            )}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2 py-2"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )}
</header>
  )
}
