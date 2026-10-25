import { LayoutDashboard, Kanban, Calendar } from 'lucide-react'
import type { NavigationKey } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  activeTab: NavigationKey
  onSelectTab: (tab: NavigationKey) => void
  upcomingInterviewsCount?: number
  isVisible?: boolean
}

interface TabItem {
  key: NavigationKey
  label: string
  icon: typeof LayoutDashboard
}

const tabs: TabItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'pipeline', label: 'Kanban', icon: Kanban },
  { key: 'interviews', label: 'Interviews', icon: Calendar },
]

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  upcomingInterviewsCount = 0,
  isVisible = true,
}: MobileBottomNavProps) {
  const handleTabClick = (key: NavigationKey) => {
    if (activeTab === key) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      onSelectTab(key)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex h-16 items-center justify-around px-4 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const isInterviews = tab.key === 'interviews'
          const showBadge = isInterviews && upcomingInterviewsCount > 0

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 relative cursor-pointer select-none active:scale-95',
                isActive
                  ? 'text-slate-900 font-semibold'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              )}
              aria-label={`${tab.label} tab`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    'size-5 transition-transform',
                    isActive ? 'scale-110 text-slate-900 stroke-[2.25]' : 'text-slate-400 stroke-[1.75]'
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-2xs ring-2 ring-white">
                    {upcomingInterviewsCount > 9 ? '9+' : upcomingInterviewsCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight mt-1 transition-colors',
                  isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 size-1 rounded-full bg-slate-900" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
