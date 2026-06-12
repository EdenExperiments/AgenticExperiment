import { describe, it, expect } from 'vitest'
import {
  setMode,
  VALID_MODES,
  ModeSwitcher,
  type VisualMode,
} from '../index'

describe('visual mode public API exports', () => {
  it('exports setMode, VALID_MODES, ModeSwitcher, and VisualMode type', () => {
    expect(typeof setMode).toBe('function')
    expect(VALID_MODES).toEqual(['clean', 'stylish'])
    expect(ModeSwitcher).toBeDefined()
    const _mode: VisualMode = 'clean'
    expect(_mode).toBe('clean')
  })
})
