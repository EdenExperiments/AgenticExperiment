import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AiGoalWizardPage from '../(app)/goals/ai/new/page'

const mockPlanGoal = vi.fn()
const mockCreateGoal = vi.fn()
const mockCreateMilestone = vi.fn()
const mockPush = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  planGoal: (...args: unknown[]) => mockPlanGoal(...args),
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

function makePlanResponse(overrides = {}) {
  return {
    plan: {
      objective: 'Run a 5km race',
      milestones: [
        { title: 'Run 1km without stopping', description: 'Week 1 target' },
        { title: 'Run 3km continuously', description: 'Week 4 target' },
        { title: 'Complete a 5km race', description: 'Final target', due_date: '2026-12-31' },
      ],
      weekly_cadence: ['3 runs per week', 'Rest on weekends'],
      risks: ['Injury risk if overtraining'],
      fallback_plan: 'Walk/run intervals if needed',
    },
    degraded_response: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPlanGoal.mockResolvedValue(makePlanResponse())
  mockCreateGoal.mockResolvedValue({
    id: 'new-goal-id',
    user_id: 'u1',
    skill_id: null,
    title: 'Run a 5km race',
    description: null,
    status: 'active',
    target_date: null,
    current_value: null,
    target_value: null,
    unit: null,
    created_at: '',
    updated_at: '',
  })
  mockCreateMilestone.mockResolvedValue({})
})

test('renders wizard input step initially', () => {
  render(<AiGoalWizardPage />, { wrapper })
  expect(screen.getByRole('heading', { name: /ai goal coach/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/goal statement/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument()
})

test('generate plan button is disabled when statement is empty', () => {
  render(<AiGoalWizardPage />, { wrapper })
  expect(screen.getByRole('button', { name: /generate plan/i })).toBeDisabled()
})

test('generate plan button is enabled when statement is filled', () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  expect(screen.getByRole('button', { name: /generate plan/i })).not.toBeDisabled()
})

test('calls planGoal with statement and transitions to preview step', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await waitFor(() => {
    expect(mockPlanGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goal_statement: 'Run a 5km race' })
    )
  })

  await screen.findByText('Run a 5km race')
  expect(screen.getByText(/objective/i)).toBeInTheDocument()
})

test('passes deadline as ISO string to planGoal', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.change(screen.getByLabelText(/target date/i), { target: { value: '2026-12-31' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await waitFor(() => {
    expect(mockPlanGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        deadline: expect.stringContaining('2026'),
      })
    )
  })
})

test('preview step shows milestones from plan', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  expect(screen.getByDisplayValue('Run 3km continuously')).toBeInTheDocument()
  expect(screen.getByDisplayValue('Complete a 5km race')).toBeInTheDocument()
})

test('preview step shows weekly cadence items', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText('3 runs per week')
  expect(screen.getByText('Rest on weekends')).toBeInTheDocument()
})

test('preview step shows risks and fallback plan', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText('Injury risk if overtraining')
  expect(screen.getByText(/walk\/run intervals/i)).toBeInTheDocument()
})

test('all milestones are enabled by default in preview', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  const toggleBtns = screen.getAllByRole('button', { name: /select milestone|deselect milestone/i })
  toggleBtns.forEach((btn) => {
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})

test('deselecting a milestone reduces count in accept button', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')

  const deselect = screen.getByRole('button', { name: /deselect milestone "run 1km without stopping"/i })
  fireEvent.click(deselect)

  expect(screen.getByRole('button', { name: /accept plan \(2 milestones\)/i })).toBeInTheDocument()
})

test('accept plan creates goal and milestones, navigates to goal detail', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  fireEvent.click(screen.getByRole('button', { name: /accept plan/i }))

  await waitFor(() => {
    expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Run a 5km race' })
    )
  })

  await waitFor(() => {
    expect(mockCreateMilestone).toHaveBeenCalledTimes(3)
    expect(mockCreateMilestone).toHaveBeenCalledWith(
      'new-goal-id',
      expect.objectContaining({ title: 'Run 1km without stopping' })
    )
  })

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/goals/new-goal-id')
  })
})

test('back button returns to input step from preview', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  fireEvent.click(screen.getByRole('button', { name: /← edit/i }))

  expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument()
})

test('shows error when planGoal fails generically', async () => {
  mockPlanGoal.mockRejectedValue(new Error('network error'))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByRole('alert')
  expect(screen.getByText(/failed to generate a plan/i)).toBeInTheDocument()
})

test('shows API key error when planGoal returns 402', async () => {
  mockPlanGoal.mockRejectedValue(new Error('402 no ai key'))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText(/ai key not configured/i)
  expect(screen.getByRole('link', { name: /account settings/i })).toBeInTheDocument()
})

test('shows rate limit error when planGoal returns 429', async () => {
  mockPlanGoal.mockRejectedValue(new Error('429 rate limit'))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText(/rate limit reached/i)
})

test('shows upstream error when planGoal returns 502', async () => {
  mockPlanGoal.mockRejectedValue(new Error('502 upstream error'))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText(/ai service unavailable/i)
})

test('shows degraded AI banner when plan has degraded_response true', async () => {
  mockPlanGoal.mockResolvedValue(makePlanResponse({ degraded_response: true }))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByText(/basic mode/i)
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

test('no degraded banner when plan has degraded_response false', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  expect(screen.queryByText(/basic mode/i)).not.toBeInTheDocument()
})

test('accept button is disabled when all milestones deselected', async () => {
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')

  const deselect = screen.getAllByRole('button', { name: /deselect milestone/i })
  deselect.forEach((btn) => fireEvent.click(btn))

  expect(screen.getByRole('button', { name: /accept plan/i })).toBeDisabled()
})

test('accept plan error shows alert', async () => {
  mockCreateGoal.mockRejectedValue(new Error('server error'))
  render(<AiGoalWizardPage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/goal statement/i), { target: { value: 'Run a 5km race' } })
  fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))

  await screen.findByDisplayValue('Run 1km without stopping')
  fireEvent.click(screen.getByRole('button', { name: /accept plan/i }))

  await screen.findByRole('alert')
  expect(screen.getByText(/failed to create goal/i)).toBeInTheDocument()
})
