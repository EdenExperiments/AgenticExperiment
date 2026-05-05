import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PresetPicker } from '../../components/PresetPicker'
import type { Preset } from '@rpgtracker/api-client'

const MOCK_PRESETS: Preset[] = [
  {
    id: 'p1',
    name: 'Running',
    description: 'Track your running progress',
    unit: 'km',
    category_id: 'cat1',
    category_name: 'Fitness & Movement',
    category_slug: 'fitness',
  },
  {
    id: 'p2',
    name: 'Weight Training',
    description: 'Track strength training sessions',
    unit: 'sessions',
    category_id: 'cat1',
    category_name: 'Fitness & Movement',
    category_slug: 'fitness',
  },
  {
    id: 'p3',
    name: 'Guitar',
    description: 'Learn to play guitar',
    unit: 'hours',
    category_id: 'cat2',
    category_name: 'Music & Audio',
    category_slug: 'music',
  },
]

describe('PresetPicker', () => {
  test('renders skeleton cards while loading', () => {
    render(
      <PresetPicker
        presets={[]}
        isLoading
        isError={false}
        onSelectPreset={() => {}}
        onStartFromScratch={() => {}}
      />
    )
    expect(screen.getAllByTestId('preset-skeleton').length).toBeGreaterThanOrEqual(6)
  })

  test('renders category cards after load', () => {
    render(
      <PresetPicker
        presets={MOCK_PRESETS}
        isLoading={false}
        isError={false}
        onSelectPreset={() => {}}
        onStartFromScratch={() => {}}
      />
    )
    expect(screen.getByText('Fitness & Movement')).toBeInTheDocument()
    expect(screen.getByText('Music & Audio')).toBeInTheDocument()
  })

  test('expanding a category shows presets and selects full preset', async () => {
    const onSelect = vi.fn()
    render(
      <PresetPicker
        presets={MOCK_PRESETS}
        isLoading={false}
        isError={false}
        onSelectPreset={onSelect}
        onStartFromScratch={() => {}}
      />
    )

    fireEvent.click(screen.getByText('Fitness & Movement'))
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Running'))
    expect(onSelect).toHaveBeenCalledWith(MOCK_PRESETS[0])
  })

  test('only one category expanded at a time', async () => {
    render(
      <PresetPicker
        presets={MOCK_PRESETS}
        isLoading={false}
        isError={false}
        onSelectPreset={() => {}}
        onStartFromScratch={() => {}}
      />
    )

    fireEvent.click(screen.getByText('Fitness & Movement'))
    await waitFor(() => expect(screen.getByText('Running')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Music & Audio'))
    await waitFor(() => {
      expect(screen.queryByText('Running')).not.toBeInTheDocument()
      expect(screen.getByText('Guitar')).toBeInTheDocument()
    })
  })
})
