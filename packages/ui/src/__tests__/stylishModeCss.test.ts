import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const pagesCss = readFileSync(join(__dirname, '../../tokens/pages.css'), 'utf-8')
const componentsCss = readFileSync(join(__dirname, '../../tokens/components.css'), 'utf-8')

describe('stylish vs classic CSS layering (F-046)', () => {
  it('keeps minimal gate identity on classic theme scope', () => {
    expect(pagesCss).toMatch(/\[data-theme="minimal"\] \.gate-section[\s\S]*border-left:\s*3px solid var\(--color-accent\)/)
  })

  it('scopes minimal entry animations to stylish only', () => {
    expect(pagesCss).toMatch(/\[data-theme="minimal"\]\[data-mode="stylish"\].*minimal-entry-fade-in/s)
    expect(pagesCss).not.toMatch(
      /\[data-theme="minimal"\] \.activity-history__entry\s*\{[^}]*animation:/
    )
  })

  it('scopes modern gate pulse animation to stylish only', () => {
    expect(pagesCss).toMatch(/\[data-theme="modern"\]\[data-mode="stylish"\][\s\S]*gate-border-pulse/)
    expect(pagesCss).not.toMatch(
      /\[data-theme="modern"\] \.gate-section\s*\{[^}]*animation:/
    )
  })

  it('scopes modern activity log animations to stylish only', () => {
    expect(pagesCss).toMatch(/\[data-theme="modern"\]\[data-mode="stylish"\][\s\S]*modern-log-fade-in/)
    expect(pagesCss).not.toMatch(
      /\[data-theme="modern"\] \.activity-history__entry\s*\{[^}]*animation:/
    )
  })

  it('keeps modern timeline structure on classic theme scope', () => {
    expect(pagesCss).toMatch(/\[data-theme="modern"\] \.activity-history::before/)
    expect(pagesCss).toMatch(/\[data-theme="modern"\] \.activity-history__entry::before/)
  })

  it('has well-formed stylish section blocks for all three themes', () => {
    expect(pagesCss).toContain('MINIMAL STYLISH MODE')
    expect(pagesCss).toContain('RETRO STYLISH MODE')
    expect(pagesCss).toContain('MODERN STYLISH MODE')
    expect(pagesCss).not.toMatch(/\{[^}]*\/\* MINIMAL STYLISH/)
    expect(pagesCss).not.toMatch(/\{[^}]*\/\* MODERN STYLISH/)
  })

  it('scopes modern ambient drift animation to stylish body layer', () => {
    expect(componentsCss).toMatch(
      /\[data-theme="modern"\]\[data-mode="stylish"\] body::before[\s\S]*modern-ambient-drift/
    )
    expect(componentsCss).not.toMatch(
      /\[data-theme="modern"\] body::before\s*\{[^}]*animation:/
    )
  })

  it('gives minimal classic a subtle desktop gradient', () => {
    expect(componentsCss).toMatch(/\[data-theme="minimal"\] body[\s\S]*linear-gradient/)
  })
})
