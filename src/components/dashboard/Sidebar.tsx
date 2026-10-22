import {
  LayoutDashboard,
  Briefcase,
  GitPullRequest,
  Calendar,
  Clock,
  Settings,
  X,
  Sparkles,
  RotateCcw,
  LogOut,
} from 'lucide-react'
import { navigationItems } from '@/data/mockData'
import type { NavigationKey } from '@/types/dashboard'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/useAuth'

interface SidebarProps {
  activeTab: NavigationKey
  onSelectTab: (key: NavigationKey) => void
  isOpen: boolean
  onClose: () => void
  upcomingInterviewsCount?: number
  onResetDemoData?: () => void
}

const iconMap = {
  LayoutDashboard,
  Briefcase,
  GitPullRequest,
  Calendar,
  Clock,
  Settings,
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  upcomingInterviewsCount,
  onResetDemoData,
}: SidebarProps) {
  const { user, logout } = useAuth()
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 md:w-52 lg:w-56 xl:w-64 flex-col bg-white border-r border-slate-200 text-slate-700 transition-all duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5 lg:px-4 xl:px-5 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Briefcase className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-none truncate">
                ApplyFlow
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide truncate block mt-1">
                Career Tracker
              </span>
            </div>
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

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2.5 lg:px-3 py-4 space-y-1">
          <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || Briefcase
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
                  className={`group flex w-full items-center justify-between rounded-lg px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`size-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.isImplemented ? (
                    badgeText && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 border-0 shrink-0 ${
                          isActive
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {badgeText}
                      </Badge>
                    )
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0 ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      Soon
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Pro / Help Box & Reset Option at Bottom */}
        <div className="p-2.5 lg:p-3 border-t border-slate-200/80 space-y-2">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Restore initial demonstration applications and interviews"
            >
              <RotateCcw className="size-3.5 text-slate-400" />
              <span>Reset demo data</span>
            </button>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <Sparkles className="size-3.5 text-slate-900" />
              <span>Pro Search Mode</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Job sync & automated follow-ups active for 6 companies.
            </p>
          </div>

          {user && (
            <div className="pt-1">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate leading-none">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-1 leading-none">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                  title="Sign out of ApplyFlow"
                  aria-label="Sign out of ApplyFlow"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
