'use client'

import { useState, useEffect } from 'react'

export interface MotionPreference {
  /** Whether animations should play (motionScale > 0) */
  prefersMotion: boolean
  /** Raw --motion-scale value from CSS custom property (0 or 1) */
  motionScale: number
}

/**
 * useMotionPreference reads the --motion-scale CSS custom property from :root
 * and returns a boolean + numeric value for gating animations.
 *
 * retro theme sets --motion-scale: 0.7 (high animation budget).
 * modern theme sets --motion-scale: 1.0 (full animation budget).
 * minimal theme sets --motion-scale: 0.3 (reduced animation).
 *
 * SSR-safe: returns { prefersMotion: false, motionScale: 0 } on the server.
 */
export function useMotionPreference(): MotionPreference {
  const [motionScale, setMotionScale] = useState(0)

  useEffect(() => {
    function read() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--motion-scale')
        .trim()
      const value = parseFloat(raw)
      setMotionScale(isNaN(value) ? 0 : value)
    }
    read()

    // Re-read when theme changes (data-theme attribute mutation)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return {
    prefersMotion: motionScale > 0,
    motionScale,
  }
}
