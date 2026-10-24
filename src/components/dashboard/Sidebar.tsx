import {
  LayoutDashboard,
  Briefcase,
  Kanban,
  Calendar,
  X,
  LogOut,
  RotateCcw,
} from 'lucide-react'
import { navigationItems } from '@/data/mockData'
import type { NavigationKey } from '@/types/dashboard'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/useAuth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeTab: NavigationKey
  onSelectTab: (key: NavigationKey) => void
  isOpen: boolean
  onClose: () => void
  upcomingInterviewsCount?: number
  onResetDemoData?: () => void
  onRefreshWorkspace?: () => void
}

const iconMap = {
  LayoutDashboard,
  Kanban,
  Calendar,
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  upcomingInterviewsCount,
  onResetDemoData,
  onRefreshWorkspace,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const handleRefreshWorkspace = onRefreshWorkspace || onResetDemoData

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AF'

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 md:w-56 lg:w-60 xl:w-64 flex-col bg-white border-r border-slate-200/80 text-slate-700 transition-all duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 xl:px-5 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <Briefcase className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 truncate">
              ApplyFlow
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 shrink-0 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1" aria-label="Main Navigation">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
              const isActive = activeTab === item.key

              // Dynamic badge count for interviews or fallback to configured badge
              const badgeText =
                item.key === 'interviews' && upcomingInterviewsCount !== undefined
                  ? upcomingInterviewsCount > 0
                    ? String(upcomingInterviewsCount)
                    : undefined
                  : item.badge

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.key)
                    onClose()
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`size-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {badgeText && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 border-0 shrink-0 font-medium ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {badgeText}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Workspace Refresh Action */}
        {handleRefreshWorkspace && (
          <div className="px-3 py-2 border-t border-slate-200/80 mt-auto">
            <button
              type="button"
              onClick={handleRefreshWorkspace}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reload saved applications and interviews from the cloud database"
              aria-label="Refresh workspace data"
            >
              <RotateCcw className="size-3.5 text-slate-400" />
              <span>Refresh workspace data</span>
            </button>
          </div>
        )}

        {/* Minimal User Profile Footer */}
        {user && (
          <div className={`p-2.5 border-t border-slate-200/80 ${handleRefreshWorkspace ? '' : 'mt-auto'}`}>
            <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="size-7.5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-semibold text-slate-900 leading-snug [overflow-wrap:anywhere]',
                      user.name.length > 24
                        ? 'text-[10px]'
                        : user.name.length > 16
                        ? 'text-[11px]'
                        : 'text-xs'
                    )}
                    title={user.name}
                  >
                    {user.name}
                  </p>
                  <p
                    className={cn(
                      'text-slate-500 leading-tight mt-0.5 [overflow-wrap:anywhere]',
                      user.email.length > 24
                        ? 'text-[8.5px]'
                        : user.email.length > 18
                        ? 'text-[9px]'
                        : 'text-[9.5px]'
                    )}
                    title={user.email}
                  >
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="size-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 flex items-center justify-center self-center"
                title="Sign out"
                aria-label="Sign out of ApplyFlow"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
