import { vi } from 'vitest'

export const cookies = vi.fn(() => Promise.resolve({
  get: vi.fn(() => undefined),
  getAll: vi.fn(() => []),
  set: vi.fn(),
  delete: vi.fn(),
}))

export const headers = vi.fn(() => Promise.resolve(new Map()))
