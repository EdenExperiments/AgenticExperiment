import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import NutriLayout from '../(app)/nutri/layout'

test('NutriLog layout sets data-theme nutri-saas and owns chrome', () => {
  vi.mocked(usePathname).mockReturnValue('/nutri')
  const { container } = render(
    <NutriLayout>
      <div>weight</div>
    </NutriLayout>
  )
  expect(container.querySelector('[data-theme="nutri-saas"]')).not.toBeNull()
  expect(screen.getAllByRole('link', { name: /weight/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /goals/i }).length).toBeGreaterThan(0)
  expect(screen.queryByRole('link', { name: /skills/i })).not.toBeInTheDocument()
})

test('shell tokens import nutri-saas and proxy stays on LifeQuest minimal', () => {
  const tokens = readFileSync(resolve(__dirname, '../../tokens.css'), 'utf-8')
  expect(tokens).toContain("@import '@rpgtracker/ui/tokens/nutri-saas.css'")

  const proxy = readFileSync(resolve(__dirname, '../../proxy.ts'), 'utf-8')
  expect(proxy).toContain("defaultTheme: 'minimal'")
  expect(proxy).not.toContain('nutri-saas')
})
