import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const tokenDir = resolve(__dirname, '../../tokens')

const productFiles = ['nutri-saas.css', 'workout-forge.css', 'mental-calm.css'] as const

describe('product themes pin shape tokens', () => {
  test.each(productFiles)('%s sets radius and shadow so LifeQuest atmosphere cannot leak', (file) => {
    const css = readFileSync(resolve(tokenDir, file), 'utf8')
    expect(css).toMatch(/--radius-md:/)
    expect(css).toMatch(/--shadow-md:/)
  })
})
