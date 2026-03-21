import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { XPBarChart } from '../XPBarChart'

const makeData = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    xp_total: (i + 1) * 50,
  }))

const makeZeroData = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    xp_total: 0,
  }))

describe('XPBarChart — AC-08: chart container minimum height 192px', () => {
  it('data-testid="xp-bar-chart" container has class h-48 or min-h-[192px]', () => {
    render(<XPBarChart data={makeData(10)} tierColor="#a855f7" />)
    const container = screen.getByTestId('xp-bar-chart')
    const classes = container.className
    const style = container.getAttribute('style') ?? ''
    const hasHeight =
      classes.includes('h-48') ||
      classes.includes('min-h-[192px]') ||
      style.includes('192px') ||
      style.includes('minHeight')
    expect(hasHeight).toBe(true)
  })
})

describe('XPBarChart — AC-12: empty-state container minimum height 192px', () => {
  it('data-testid="xp-chart-empty-state" has class min-h-[192px] or inline minHeight when all xp is zero', () => {
    render(<XPBarChart data={makeZeroData(30)} tierColor="#a855f7" />)
    const emptyState = screen.getByTestId('xp-chart-empty-state')
    const classes = emptyState.className
    const style = emptyState.getAttribute('style') ?? ''
    const hasMinHeight =
      classes.includes('min-h-[192px]') ||
      classes.includes('h-48') ||
      style.includes('192') ||
      style.includes('minHeight')
    expect(hasMinHeight).toBe(true)
  })
})

describe('XPBarChart — AC-09: x-axis date labels rendered', () => {
  it('renders at least one x-axis label element when data is non-empty', () => {
    render(<XPBarChart data={makeData(7)} tierColor="#a855f7" />)
    // Labels should be rendered with data-testid="xp-chart-label"
    const labels = screen.getAllByTestId('xp-chart-label')
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })

  it('label count is ≤ 7 for a 30-entry data array', () => {
    render(<XPBarChart data={makeData(30)} tierColor="#a855f7" />)
    const labels = screen.getAllByTestId('xp-chart-label')
    // stride = Math.max(1, Math.floor(30 / 7)) = Math.max(1, 4) = 4
    // visible labels = ceil(30 / 4) = 8, but spec says ≤ 7
    // The implementation should produce ≤ 7 non-empty labels
    const nonEmptyLabels = labels.filter((el) => el.textContent && el.textContent.trim() !== '')
    expect(nonEmptyLabels.length).toBeLessThanOrEqual(7)
  })

  it('label count equals data length when data has ≤ 7 entries (stride clamps to 1)', () => {
    const data = makeData(5)
    render(<XPBarChart data={data} tierColor="#a855f7" />)
    // stride = Math.max(1, Math.floor(5 / 7)) = Math.max(1, 0) = 1
    // every bar gets a label — 5 non-empty labels
    const labels = screen.getAllByTestId('xp-chart-label')
    const nonEmptyLabels = labels.filter((el) => el.textContent && el.textContent.trim() !== '')
    expect(nonEmptyLabels.length).toBe(data.length)
  })
})

describe('XPBarChart — AC-10: bar aria-label format "MMM D — N XP"', () => {
  it('first bar has aria-label or title containing "—" and "XP"', () => {
    render(<XPBarChart data={makeData(5)} tierColor="#a855f7" />)
    const bars = screen.getAllByTestId('xp-bar')
    const firstBar = bars[0]
    const ariaLabel = firstBar.getAttribute('aria-label') ?? ''
    const title = firstBar.getAttribute('title') ?? ''
    const label = ariaLabel || title
    expect(label).toMatch(/—/)
    expect(label).toMatch(/XP/)
  })

  it('first bar title/aria-label does NOT use old YYYY-MM-DD: N XP format', () => {
    render(<XPBarChart data={makeData(5)} tierColor="#a855f7" />)
    const bars = screen.getAllByTestId('xp-bar')
    const firstBar = bars[0]
    const ariaLabel = firstBar.getAttribute('aria-label') ?? ''
    const title = firstBar.getAttribute('title') ?? ''
    const label = ariaLabel || title
    // Old format was "2026-03-01: 50 XP" — colon separator, not em dash
    expect(label).not.toMatch(/\d{4}-\d{2}-\d{2}:/)
  })
})
