/**
 * @file src/hooks/use-mobile.ts
 * @description Hook that determines if the user's viewport lies below mobile breakpoints.
 * 
 * WHY IT'S NEEDED:
 * Facilitates responsive layout rules (like auto-collapsing navigational bars) in JavaScript logic.
 * 
 * FLOW OF EXECUTION:
 * 1. Checks matching state using the window API: `window.matchMedia("(max-width: 767px)")`.
 * 2. Attaches a change event listener to track window width modifications in real-time.
 * 3. Returns the boolean mobile active state.
 * 
 * CONNECTIONS:
 * - Consumed by `src/components/ui/sidebar.tsx` layout components.
 */

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Compile media query expression matching thresholds
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Callback mapping viewport dimension updates
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Evict listener hooks when component unmounts
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

