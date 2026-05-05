import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PasswordPage from '../(app)/account/password/page'

const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  changePassword: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

import { changePassword } from '@rpgtracker/api-client'

beforeEach(() => {
  vi.clearAllMocks()
})

test('renders all form fields', () => {
  render(<PasswordPage />)
  expect(screen.getByPlaceholderText(/current password/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText('New password (min 8 characters)')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
})

test('renders heading', () => {
  render(<PasswordPage />)
  expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
})

test('shows validation error when new password is too short', async () => {
  render(<PasswordPage />)
  fireEvent.change(screen.getByPlaceholderText(/current password/i), { target: { value: 'oldpass' } })
  fireEvent.change(screen.getByPlaceholderText('New password (min 8 characters)'), { target: { value: 'short' } })
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!)
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i)
  )
  expect(changePassword).not.toHaveBeenCalled()
})

test('shows validation error when confirm does not match new password', async () => {
  render(<PasswordPage />)
  fireEvent.change(screen.getByPlaceholderText(/current password/i), { target: { value: 'oldpass' } })
  fireEvent.change(screen.getByPlaceholderText('New password (min 8 characters)'), { target: { value: 'newpassword123' } })
  fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'mismatch' } })
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!)
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i)
  )
  expect(changePassword).not.toHaveBeenCalled()
})

test('calls changePassword with correct fields on success', async () => {
  vi.mocked(changePassword).mockResolvedValue({ status: 'password_changed' })
  render(<PasswordPage />)
  fireEvent.change(screen.getByPlaceholderText(/current password/i), { target: { value: 'oldpass123' } })
  fireEvent.change(screen.getByPlaceholderText('New password (min 8 characters)'), { target: { value: 'newpass123' } })
  fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpass123' } })
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!)
  await waitFor(() => expect(changePassword).toHaveBeenCalledWith({
    current_password: 'oldpass123',
    new_password: 'newpass123',
    confirm_new_password: 'newpass123',
  }))
  expect(mockPush).toHaveBeenCalledWith('/account')
})

test('calls changePassword without confirm when confirm field is empty', async () => {
  vi.mocked(changePassword).mockResolvedValue({ status: 'password_changed' })
  render(<PasswordPage />)
  fireEvent.change(screen.getByPlaceholderText(/current password/i), { target: { value: 'oldpass123' } })
  fireEvent.change(screen.getByPlaceholderText('New password (min 8 characters)'), { target: { value: 'newpass123' } })
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!)
  await waitFor(() => expect(changePassword).toHaveBeenCalledWith({
    current_password: 'oldpass123',
    new_password: 'newpass123',
    confirm_new_password: undefined,
  }))
  expect(mockPush).toHaveBeenCalledWith('/account')
})

test('shows API error message on failure', async () => {
  vi.mocked(changePassword).mockRejectedValue(new Error('incorrect current password'))
  render(<PasswordPage />)
  fireEvent.change(screen.getByPlaceholderText(/current password/i), { target: { value: 'wrongpass' } })
  fireEvent.change(screen.getByPlaceholderText('New password (min 8 characters)'), { target: { value: 'newpass123' } })
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!)
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/incorrect current password/i)
  )
  expect(mockPush).not.toHaveBeenCalled()
})

test('cancel button calls router.back', () => {
  render(<PasswordPage />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(mockBack).toHaveBeenCalled()
})
