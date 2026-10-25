import { useState, useEffect, useRef } from 'react'

/**
 * Tracks scroll direction to auto-hide and reveal navigation bars.
 * - Scrolling down hides the navbars to maximize screen space.
 * - Scrolling up (or returning near the top) reveals the navbars.
 */
export function useScrollDirection(threshold = 12): boolean {
  const [isNavVisible, setIsNavVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const delta = currentScrollY - lastScrollY.current

          // Always reveal navbars near the top of the page
          if (currentScrollY <= 20) {
            setIsNavVisible(true)
            lastScrollY.current = currentScrollY
          } else if (Math.abs(delta) >= threshold) {
            if (delta > 0) {
              // Scrolling down -> hide both top and bottom navbars
              setIsNavVisible(false)
            } else {
              // Scrolling up -> reveal both navbars
              setIsNavVisible(true)
            }
            lastScrollY.current = currentScrollY
          }

          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return isNavVisible
}
