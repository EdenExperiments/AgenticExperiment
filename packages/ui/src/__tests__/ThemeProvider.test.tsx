import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '../ThemeProvider'

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset data-theme attribute between tests
    document.documentElement.removeAttribute('data-theme')
  })

  it('applies the given theme as data-theme on <html>', () => {
    render(
      <ThemeProvider theme="rpg-game">
        <div>content</div>
      </ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-game')
  })

  it('renders children', () => {
    render(
      <ThemeProvider theme="nutri-saas">
        <p>hello</p>
      </ThemeProvider>
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('updates data-theme when theme prop changes', () => {
    const { rerender } = render(
      <ThemeProvider theme="rpg-game"><div /></ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-game')

    rerender(<ThemeProvider theme="rpg-clean"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-clean')
  })
})
