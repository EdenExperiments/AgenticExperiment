import { vi } from 'vitest'

export const NextRequest = vi.fn()
export const NextResponse = {
  next: vi.fn(() => ({ cookies: { set: vi.fn() } })),
  redirect: vi.fn(),
  json: vi.fn(),
}
