import type { NavItem } from '@rpgtracker/ui'

export const LIFEQUEST_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', matchPrefix: '/dashboard', icon: '🏠' },
  { label: 'Skills', href: '/skills', matchPrefix: '/skills', icon: '⚔️' },
  { label: 'Goals', href: '/goals', matchPrefix: '/goals', icon: '🎯' },
  { label: 'Account', href: '/account', matchPrefix: '/account', icon: '👤' },
]

export const NUTRI_NAV: NavItem[] = [
  { label: 'Today', href: '/nutri', matchPrefix: '/nutri', icon: '🥗' },
  { label: 'Fast', href: '/nutri/fast', matchPrefix: '/nutri/fast', icon: '⏳' },
  { label: 'Cook', href: '/nutri/cook', matchPrefix: '/nutri/cook', icon: '🍳' },
  { label: 'Weight', href: '/nutri/weight', matchPrefix: '/nutri/weight', icon: '⚖️' },
]

export const WORKOUT_NAV: NavItem[] = [
  { label: 'Today', href: '/workout', matchPrefix: '/workout', icon: '💪' },
  { label: 'History', href: '/workout/history', matchPrefix: '/workout/history', icon: '📜' },
]

export const MIND_NAV: NavItem[] = [
  { label: 'Check-in', href: '/mind', matchPrefix: '/mind', icon: '🫧' },
  { label: 'Journal', href: '/mind/journal', matchPrefix: '/mind/journal', icon: '📓' },
]

const PRODUCT_PREFIXES = ['/nutri', '/workout', '/mind'] as const

export function isProductRoute(pathname: string): boolean {
  return PRODUCT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
