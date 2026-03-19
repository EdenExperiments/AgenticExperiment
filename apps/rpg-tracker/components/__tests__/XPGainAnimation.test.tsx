import { render, screen } from '@testing-library/react'
import { XPGainAnimation } from '../XPGainAnimation'

// Mock framer-motion to render children directly
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children: React.ReactNode }) => (
      <div data-testid={props['data-testid'] as string}>{children}</div>
    ),
  },
}))

// Mock useMotionPreference
const mockUseMotionPreference = vi.fn()
vi.mock('@rpgtracker/ui', () => ({
  useMotionPreference: () => mockUseMotionPreference(),
}))

beforeEach(() => {
  mockUseMotionPreference.mockReturnValue({ prefersMotion: true, motionScale: 1 })
})

test('renders +XP text when xpAmount > 0 and prefersMotion is true (AC-3)', () => {
  render(<XPGainAnimation xpAmount={25} animationKey="1" />)
  expect(screen.getByTestId('xp-gain-animation')).toHaveTextContent('+25 XP')
})

test('renders nothing when xpAmount is 0', () => {
  render(<XPGainAnimation xpAmount={0} animationKey="1" />)
  expect(screen.queryByTestId('xp-gain-animation')).not.toBeInTheDocument()
})

test('renders nothing when xpAmount is null', () => {
  render(<XPGainAnimation xpAmount={null} animationKey="1" />)
  expect(screen.queryByTestId('xp-gain-animation')).not.toBeInTheDocument()
})

test('renders nothing when prefersMotion is false (AC-4, rpg-clean)', () => {
  mockUseMotionPreference.mockReturnValue({ prefersMotion: false, motionScale: 0 })
  render(<XPGainAnimation xpAmount={25} animationKey="1" />)
  expect(screen.queryByTestId('xp-gain-animation')).not.toBeInTheDocument()
})

test('displays correct XP amount', () => {
  render(<XPGainAnimation xpAmount={100} animationKey="2" />)
  expect(screen.getByTestId('xp-gain-animation')).toHaveTextContent('+100 XP')
})
