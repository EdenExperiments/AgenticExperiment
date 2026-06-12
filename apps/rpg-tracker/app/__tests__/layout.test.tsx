import { render } from '@testing-library/react'
import { cookies } from 'next/headers'
import RootLayout from '../layout'

function mockCookieStore(values: Record<string, string | undefined>) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      const value = values[name]
      return value !== undefined ? { name, value } : undefined
    },
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  } as Awaited<ReturnType<typeof cookies>>)
}

describe('RootLayout visual mode SSR (AC-045-1, AC-045-4)', () => {
  it('defaults data-mode to clean when rpgt-mode cookie is absent', async () => {
    mockCookieStore({ 'rpgt-theme': 'minimal' })

    const jsx = await RootLayout({ children: <div>child</div> })
    render(jsx)

    expect(document.documentElement.getAttribute('data-mode')).toBe('clean')
  })

  it('reads rpgt-mode cookie into html data-mode attribute', async () => {
    mockCookieStore({ 'rpgt-theme': 'minimal', 'rpgt-mode': 'stylish' })

    const jsx = await RootLayout({ children: <div>child</div> })
    render(jsx)

    expect(document.documentElement.getAttribute('data-mode')).toBe('stylish')
  })
})
