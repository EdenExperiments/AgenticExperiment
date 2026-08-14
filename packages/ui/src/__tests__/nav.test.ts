import { describe, expect, it } from 'vitest'
import { navItemIsActive, type NavItem } from '../nav'

const items: NavItem[] = [
  { label: 'Today', href: '/nutri', matchPrefix: '/nutri', icon: '🥗' },
  { label: 'Fast', href: '/nutri/fast', matchPrefix: '/nutri/fast', icon: '⏳' },
  { label: 'Weight', href: '/nutri/weight', matchPrefix: '/nutri/weight', icon: '⚖️' },
]

describe('navItemIsActive', () => {
  it('marks Today only on the product root', () => {
    expect(navItemIsActive('/nutri', items[0], items)).toBe(true)
    expect(navItemIsActive('/nutri/fast', items[0], items)).toBe(false)
  })

  it('marks the longest matching prefix', () => {
    expect(navItemIsActive('/nutri/fast', items[1], items)).toBe(true)
    expect(navItemIsActive('/nutri/weight', items[2], items)).toBe(true)
  })
})
