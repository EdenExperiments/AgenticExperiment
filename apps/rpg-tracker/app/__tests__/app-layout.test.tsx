import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import AppLayout from '../(app)/layout'

test('renders navigation', () => {
  vi.mocked(usePathname).mockReturnValue('/dashboard')
  render(<AppLayout><div>content</div></AppLayout>)
  // BottomTabBar is md:hidden; Sidebar is hidden md:flex — check nav links are present
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
})

// --- AC-01: Container strategy — max-w-[1500px] w-[90%] mx-auto wrapper inside <main> ---
describe('AC-01: layout container strategy', () => {
  test('content wrapper inside <main> has max-w-[1500px] class', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<AppLayout><div data-testid="page-content">content</div></AppLayout>)
    const main = document.querySelector('main')
    expect(main).not.toBeNull()
    // The wrapper div inside <main> must have max-w-[1500px]
    const wrapper = main!.querySelector('[class*="max-w-\\[1500px\\]"]')
    expect(wrapper).not.toBeNull()
  })

  test('content wrapper inside <main> has w-[90%] class', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<AppLayout><div data-testid="page-content">content</div></AppLayout>)
    const main = document.querySelector('main')
    expect(main).not.toBeNull()
    const wrapper = main!.querySelector('[class*="w-\\[90%\\]"]')
    expect(wrapper).not.toBeNull()
  })

  test('content wrapper inside <main> has mx-auto class', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<AppLayout><div data-testid="page-content">content</div></AppLayout>)
    const main = document.querySelector('main')
    expect(main).not.toBeNull()
    // Find wrapper that has both max-w-[1500px] and mx-auto
    const allDivs = Array.from(main!.querySelectorAll('div'))
    const containerDiv = allDivs.find(el =>
      el.className.includes('max-w-[1500px]') && el.className.includes('mx-auto')
    )
    expect(containerDiv).toBeDefined()
  })

  test('page content is rendered inside the constrained wrapper', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<AppLayout><div data-testid="page-content">content</div></AppLayout>)
    const pageContent = screen.getByTestId('page-content')
    // The content testid element must be a descendant of a div with max-w-[1500px]
    let el: HTMLElement | null = pageContent
    let foundContainer = false
    while (el && el.tagName !== 'MAIN') {
      if (el.className && el.className.includes('max-w-[1500px]')) {
        foundContainer = true
        break
      }
      el = el.parentElement
    }
    expect(foundContainer).toBe(true)
  })
})
