import { useEffect, useState } from 'react'
import type { DashboardModule } from '../types'

export function useIsDesktop(breakpoint = 960): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(`(min-width: ${breakpoint}px)`).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const onChange = () => setDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])

  return desktop
}

export function clampLayout(mod: DashboardModule): DashboardModule {
  const w = Math.min(100, Math.max(18, mod.w))
  const h = Math.min(100, Math.max(16, mod.h))
  const x = Math.min(100 - w, Math.max(0, mod.x))
  const y = Math.min(100 - h, Math.max(0, mod.y))
  return { ...mod, x, y, w, h }
}

export function snapPct(n: number, step = 0.5): number {
  return Math.round(n / step) * step
}
