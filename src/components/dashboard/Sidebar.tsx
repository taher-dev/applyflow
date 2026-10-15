import {
  LayoutDashboard,
  Briefcase,
  GitPullRequest,
  Calendar,
  Clock,
  Settings,
  X,
  Sparkles,
} from 'lucide-react'
import { navigationItems } from '@/data/mockData'
import type { NavigationKey } from '@/types/dashboard'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  activeTab: NavigationKey
  onSelectTab: (key: NavigationKey) => void
  isOpen: boolean
  onClose: () => void
}

const iconMap = {
  LayoutDashboard,
  Briefcase,
  GitPullRequest,
  Calendar,
  Clock,
  Settings,
}

export function Sidebar({ activeTab, onSelectTab, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 md:w-52 lg:w-56 xl:w-64 flex-col bg-slate-950 border-r border-slate-800 text-slate-300 transition-all duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5 lg:px-4 xl:px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs shadow-blue-500/20">
              <Briefcase className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold tracking-tight text-white block leading-none truncate">
                ApplyFlow
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide truncate block mt-0.5">
                Career Tracker
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white shrink-0"
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

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.key)
                    onClose()
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`size-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.isImplemented ? (
                    item.badge && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 border-0 shrink-0 ${
                          isActive
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0 ${
                        isActive
                          ? 'bg-blue-700/80 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800/80'
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

        {/* Pro / Help Box at Bottom */}
        <div className="p-2.5 lg:p-3 border-t border-slate-800/80">
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="size-3.5 text-blue-400" />
              <span>Pro Search Mode</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Job sync & automated follow-ups active for 6 companies.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
