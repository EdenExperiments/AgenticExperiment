// Wave 1 – T2 regression tests for the Change Password page
//
// T2 contract:
//  - Page at /account/password renders a Change Password form
//  - Form has: current_password, new_password, confirm_new_password fields
//  - Uses api-client changePassword() function (not raw fetch to /api/account/password)
//  - The endpoint is /api/v1/account/password (with /v1/ prefix)
//  - Error from API is rendered in the form
//  - On success, router.push('/account') is called
//  - Submit button disabled while saving
//
// INTENTIONAL RED on main:
//  - The current page POSTs directly to /api/account/password (missing /v1/)
//  - The current page has no confirm_new_password field
//  - The current page does not use api-client changePassword()
// T2-AC-4 and the api-client delegation tests are intentional red on main.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PasswordPage from '../(app)/account/password/page'

const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

// T2 contract: page uses changePassword() from @rpgtracker/api-client
// INTENTIONAL RED on main: changePassword does not exist in api-client on main.
const mockChangePassword = vi.fn()
vi.mock('@rpgtracker/api-client', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  getAccount: vi.fn().mockResolvedValue({ display_name: 'Test', email: 'test@example.com' }),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
}))

// Mock fetch for tests that test the current page behaviour on main.
// On main, the page uses raw fetch. We mock it to simulate the API.
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockChangePassword.mockResolvedValue({ status: 'password_changed' })

  // Default fetch mock: success
  fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: 'password_changed' }), { status: 200 })
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── T2-AC-1: Page renders Change Password heading ──────────────────────────

test('renders Change Password heading', () => {
  render(<PasswordPage />)
  expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
})

// ─── T2-AC-2: Page has current_password field ───────────────────────────────

test('renders current password input', () => {
  render(<PasswordPage />)
  expect(screen.getByPlaceholderText(/current password/i)).toBeInTheDocument()
})

// ─── T2-AC-3: Page has new_password field ───────────────────────────────────

test('renders new password input', () => {
  render(<PasswordPage />)
  expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument()
})

// ─── T2-AC-4: Page has confirm_new_password field ───────────────────────────
// INTENTIONAL RED on main: no confirm field exists on the current page.

test('[INTENTIONAL RED on main] renders confirm password input', () => {
  render(<PasswordPage />)
  expect(screen.getByPlaceholderText(/confirm.*password/i)).toBeInTheDocument()
})

// Helper: fill and submit the form
async function fillAndSubmit(opts: {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
} = {}) {
  const {
    currentPassword = 'oldpassword1',
    newPassword = 'newpassword1',
    confirmPassword = 'newpassword1',
  } = opts

  fireEvent.change(screen.getByPlaceholderText(/current password/i), {
    target: { value: currentPassword },
  })

  // Use exact match for "New password" to avoid matching "Confirm new password"
  const newPwdInput = screen.getByPlaceholderText(/^new password$/i)
  fireEvent.change(newPwdInput, { target: { value: newPassword } })

  const confirmInput = screen.queryByPlaceholderText(/confirm.*password/i)
  if (confirmInput) {
    fireEvent.change(confirmInput, { target: { value: confirmPassword } })
  }

  const form = screen.getByRole('button', { name: /change password/i }).closest('form')
  await act(async () => {
    fireEvent.submit(form!)
  })
}

// ─── T2-AC-5: On success, router.push('/account') ───────────────────────────

test('on success navigates to /account', async () => {
  render(<PasswordPage />)
  await fillAndSubmit()

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/account')
  })
})

// ─── T2-AC-6: API error is displayed ────────────────────────────────────────

test('displays API error message on failure', async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ error: 'current password is incorrect' }), { status: 422 })
  )
  // Also make mockChangePassword fail for T2 path
  mockChangePassword.mockRejectedValue(new Error('current password is incorrect'))

  render(<PasswordPage />)
  await fillAndSubmit({ currentPassword: 'wrongpass' })

  await waitFor(() => {
    expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument()
  })
})

// ─── T2-AC-7: Submit button is disabled while saving ────────────────────────

test('submit button is disabled while saving', async () => {
  let resolveFetch!: (value: Response) => void
  fetchMock.mockImplementation(
    () => new Promise<Response>(resolve => { resolveFetch = resolve })
  )
  mockChangePassword.mockImplementation(
    () => new Promise<{ status: string }>(resolve => {
      // won't be called on main but resolve for T2 path
      resolveFetch(new Response(JSON.stringify({ status: 'password_changed' }), { status: 200 }))
      resolve({ status: 'password_changed' })
    })
  )

  render(<PasswordPage />)

  fireEvent.change(screen.getByPlaceholderText(/current password/i), {
    target: { value: 'oldpassword1' },
  })
  const newPwdInput = screen.getByPlaceholderText(/^new password$/i)
  fireEvent.change(newPwdInput, { target: { value: 'newpassword1' } })

  const confirmInput = screen.queryByPlaceholderText(/confirm.*password/i)
  if (confirmInput) {
    fireEvent.change(confirmInput, { target: { value: 'newpassword1' } })
  }

  const form = screen.getByRole('button', { name: /change password/i }).closest('form')
  act(() => { fireEvent.submit(form!) })

  await waitFor(() => {
    const submitBtn = screen.queryByRole('button', { name: /saving/i })
      ?? screen.queryByRole('button', { name: /change password/i })
    if (submitBtn) {
      expect(submitBtn).toBeDisabled()
    }
  })

  // Let it finish
  await act(async () => {
    resolveFetch(new Response(JSON.stringify({ status: 'password_changed' }), { status: 200 }))
  })
})

// ─── T2-AC-8: submit calls changePassword() from api-client ─────────────────
// INTENTIONAL RED on main: page uses raw fetch(), not api-client changePassword().
// On main, mockChangePassword is never called; the page calls fetch directly.

test('[INTENTIONAL RED on main] submit calls changePassword() from api-client', async () => {
  render(<PasswordPage />)
  await fillAndSubmit()

  await waitFor(() => {
    expect(mockChangePassword).toHaveBeenCalledTimes(1)
  })
  expect(mockChangePassword).toHaveBeenCalledWith(
    expect.objectContaining({
      current_password: 'oldpassword1',
      new_password: 'newpassword1',
    })
  )
})

// ─── T2-AC-9: Regression — correct /v1/ endpoint ────────────────────────────
// INTENTIONAL RED on main: page POSTs to /api/account/password (missing /v1/).
// Asserts that fetch is NOT called with the wrong URL.

test('[INTENTIONAL RED on main] does not POST to wrong /api/account/password endpoint', async () => {
  render(<PasswordPage />)
  await fillAndSubmit()

  // Allow any pending state to settle
  await waitFor(() => {}, { timeout: 100 })

  const wrongUrlCalls = fetchMock.mock.calls.filter(([url]) => {
    const u = typeof url === 'string' ? url : (url as Request)?.url ?? ''
    return u.includes('/api/account/password') && !u.includes('/v1/')
  })

  // If the page correctly uses api-client, fetch is not called with wrong URL.
  // On main, fetch IS called with wrong URL → this assertion fails (intentional red).
  expect(wrongUrlCalls).toHaveLength(0)
})
