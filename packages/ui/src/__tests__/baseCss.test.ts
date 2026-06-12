import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('base.css mode scaffolding (AC-045-8)', () => {
  it('uses [data-theme][data-mode="stylish"] selector for mode-aware tokens', () => {
    const cssPath = join(__dirname, '../../tokens/base.css')
    const css = readFileSync(cssPath, 'utf-8')

    expect(css).toMatch(/\[data-theme\]\[data-mode="stylish"\]/)
  })
})
