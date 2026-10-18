import { Bell, Menu, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchSubmit?.()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-4 sm:px-6 lg:px-8 backdrop-blur-xs gap-3">
      {/* Left: Mobile Toggle (on desktop sidebar is permanently visible) */}
      <div className="flex items-center shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
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
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer p-0 bg-transparent border-0"
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
            className="w-full pl-8.5 sm:pl-9 pr-8 h-9 text-xs sm:text-sm bg-muted/40 border-border/80 focus-visible:bg-background"
            aria-label={placeholder || 'Search'}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-sm"
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
          className="relative size-9 text-muted-foreground hover:text-foreground border-border/80 cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="size-4.5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600 ring-2 ring-background" />
        </Button>

        {/* Profile Avatar */}
        <Avatar className="size-9 border border-border shrink-0 cursor-pointer">
          <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
            TM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

