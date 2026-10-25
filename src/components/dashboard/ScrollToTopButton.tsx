import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollToTopButtonProps {
  isNavVisible?: boolean
}

export function ScrollToTopButton({ isNavVisible = true }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={cn(
        'fixed right-4 md:bottom-6 md:right-6 z-30 flex size-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-slate-800 hover:scale-105 active:scale-95 cursor-pointer',
        isNavVisible ? 'bottom-20' : 'bottom-5',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none'
      )}
      aria-label="Scroll back to top"
    >
      <ArrowUp className="size-4.5 stroke-[2.25]" />
    </button>
  )
}
