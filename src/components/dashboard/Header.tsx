import { Bell, Menu, Search, X, LogOut, User as UserIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/useAuth'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleSidebar: () => void
  onSearchSubmit?: () => void
  placeholder?: string
}

export function Header({
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  onSearchSubmit,
  placeholder,
}: HeaderProps) {
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-xs gap-3">
      {/* Left: Mobile Toggle (on desktop sidebar is permanently visible) */}
      <div className="flex items-center shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Center: Search Input with fluid responsive sizing */}
      <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
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

      {/* Right: Notifications + Profile Avatar (icon-only, zero text clutter) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications */}
        <Button
          variant="outline"
          size="icon"
          className="relative size-9 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="size-4.5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-slate-900 ring-2 ring-white" />
        </Button>

        {/* Profile Avatar with Logout Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
              aria-label="User account menu"
            >
              <Avatar className="size-9 border border-slate-200 shrink-0">
                <AvatarFallback className="bg-slate-900 text-white font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-md border-slate-200 bg-white">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-slate-900 flex items-center gap-1.5">
                  <UserIcon className="size-3.5 text-slate-900" />
                  <span>{user?.name || 'Account'}</span>
                </p>
                <p className="text-xs leading-none text-slate-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
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
    </header>
  )
}

