'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMotionPreference } from '@rpgtracker/ui'

export interface XPGainAnimationProps {
  /** XP amount to display. Set to 0 or null to hide. */
  xpAmount: number | null
  /** Unique key to trigger re-animation for the same amount */
  animationKey: string | number
}

/**
 * XPGainAnimation — floating "+N XP" text that rises and fades.
 *
 * retro/modern (motionScale>0): spring animation, rises ~60px, fades over 1.2s, accent color
 * minimal (motionScale=0.3): reduced animation; renders nothing when motionScale=0
 */
export function XPGainAnimation({ xpAmount, animationKey }: XPGainAnimationProps) {
  const { prefersMotion } = useMotionPreference()

  if (!prefersMotion || !xpAmount || xpAmount <= 0) {
    return null
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -60 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 1.2,
          ease: 'easeOut',
        }}
        className="absolute pointer-events-none text-lg font-bold"
        style={{
          color: 'var(--color-accent, #d4a853)',
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
        }}
        aria-live="polite"
        data-testid="xp-gain-animation"
      >
        +{xpAmount} XP
      </motion.div>
    </AnimatePresence>
  )
}
