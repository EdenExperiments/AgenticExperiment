import { describe, it, expect, beforeEach } from 'vitest'
import { setMode, VALID_MODES, type VisualMode } from '../ThemeProvider'

describe('setMode (AC-045-2, AC-045-3)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-mode')
    document.cookie = ''
  })

  it('sets data-mode attribute and rpgt-mode cookie for stylish', () => {
    setMode('stylish')

    expect(document.documentElement.getAttribute('data-mode')).toBe('stylish')
    expect(document.cookie).toContain('rpgt-mode=stylish')
    expect(document.cookie).toContain('path=/')
    expect(document.cookie).toMatch(/SameSite=Lax/i)
  })

  it('sets data-mode attribute and cookie for clean', () => {
    document.documentElement.setAttribute('data-mode', 'stylish')
    setMode('clean')

    expect(document.documentElement.getAttribute('data-mode')).toBe('clean')
    expect(document.cookie).toContain('rpgt-mode=clean')
  })

  it('ignores invalid mode values without changing attribute or cookie', () => {
    document.documentElement.setAttribute('data-mode', 'clean')
    setMode('invalid' as VisualMode)

    expect(document.documentElement.getAttribute('data-mode')).toBe('clean')
    expect(document.cookie).not.toContain('rpgt-mode=invalid')
  })
})

describe('VALID_MODES', () => {
  it('includes clean and stylish only', () => {
    expect(VALID_MODES).toEqual(['clean', 'stylish'])
  })
})
