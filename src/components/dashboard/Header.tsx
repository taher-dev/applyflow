import { Bell, Menu, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  title: string
  subtitle?: string
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleSidebar: () => void
}

export function Header({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-4 sm:px-6 backdrop-blur-xs">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-muted-foreground font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative w-32 sm:w-64 md:w-72 lg:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8.5 pr-7 h-9 text-xs sm:text-sm bg-muted/40 border-border/80 focus-visible:bg-background"
            aria-label="Search applications"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              aria-label="Clear header search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <Button
          variant="outline"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground border-border/80"
          aria-label="View notifications"
        >
          <Bell className="size-4.5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600 ring-2 ring-background" />
        </Button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
          <Avatar className="size-9 border border-border">
            <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
              TM
            </AvatarFallback>
          </Avatar>

          <div className="hidden lg:block text-left leading-tight">
            <p className="text-xs font-semibold text-foreground">Taher Monmoy</p>
            <p className="text-[11px] text-muted-foreground">Software Engineer</p>
          </div>
        </div>
      </div>
    </header>
  )
}
