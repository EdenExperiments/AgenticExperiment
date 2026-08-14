import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('nutri-saas tokens', () => {
  it('applies on any data-theme node so a nested layout can own the theme', () => {
    const css = readFileSync(join(__dirname, '../../tokens/nutri-saas.css'), 'utf-8')
    expect(css).toMatch(/\[data-theme="nutri-saas"\]/)
    expect(css).not.toMatch(/:root\[data-theme="nutri-saas"\]/)
  })
})
