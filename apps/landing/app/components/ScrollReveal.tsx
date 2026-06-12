'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface Props {
  children: ReactNode
  delay?: number
  className?: string
}

function getRevealClasses(): string[] | null {
  if (typeof document === 'undefined') return null

  const mode = document.documentElement.getAttribute('data-mode')
  if (mode !== 'stylish') return null

  const theme = document.documentElement.getAttribute('data-theme') ?? 'minimal'
  if (theme === 'retro' || theme === 'modern') {
    return ['reveal', 'reveal-reveal']
  }
  return ['reveal']
}

export default function ScrollReveal({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) return

    const revealClasses = getRevealClasses()
    if (!revealClasses) return

    revealClasses.forEach(cls => el.classList.add(cls))

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`
          el.classList.add('in-view')
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className || undefined}>
      {children}
    </div>
  )
}
