import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('pages.css session stylish treatments', () => {
  const css = readFileSync(join(__dirname, '../../tokens/pages.css'), 'utf-8')

  it('defines clean baseline with glow hidden by default', () => {
    expect(css).toMatch(/\.session-page__timer-glow\s*\{[^}]*display:\s*none/s)
  })

  it('scopes minimal stylish breathing to work phase timer ring', () => {
    expect(css).toMatch(
      /\[data-theme="minimal"\]\[data-mode="stylish"\].*session-page--work.*session-page__timer-ring/s
    )
    expect(css).toContain('session-minimal-breathe')
  })

  it('scopes retro stylish XP pulse', () => {
    expect(css).toMatch(
      /\[data-theme="retro"\]\[data-mode="stylish"\].*session-page__xp/s
    )
    expect(css).toContain('session-retro-xp-pulse')
  })

  it('scopes modern stylish ambient glow to work phase', () => {
    expect(css).toMatch(
      /\[data-theme="modern"\]\[data-mode="stylish"\].*session-page__timer-glow/s
    )
  })

  it('respects prefers-reduced-motion for session animations', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.session-page__timer-ring/)
  })
})
