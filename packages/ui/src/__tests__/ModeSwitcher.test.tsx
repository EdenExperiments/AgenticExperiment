import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ModeSwitcher } from '../ModeSwitcher'
import * as ThemeProviderModule from '../ThemeProvider'

describe('ModeSwitcher', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-mode')
    document.cookie = ''
  })

  it('renders Clean and Stylish options in a labelled group', () => {
    render(<ModeSwitcher />)

    expect(screen.getByRole('group', { name: /visual mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clean/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stylish/i })).toBeInTheDocument()
  })

  it('calls setMode when Stylish is selected', async () => {
    const user = userEvent.setup()
    const setModeSpy = vi.spyOn(ThemeProviderModule, 'setMode')

    render(<ModeSwitcher />)
    await user.click(screen.getByRole('button', { name: /stylish/i }))

    expect(setModeSpy).toHaveBeenCalledWith('stylish')
    setModeSpy.mockRestore()
  })
})
