export type NavItem = {
  label: string
  href: string
  icon: string
  matchPrefix: string
}

export function navItemIsActive(
  pathname: string,
  item: NavItem,
  items: readonly NavItem[],
): boolean {
  const matches = items.filter(
    (candidate) =>
      pathname === candidate.matchPrefix || pathname.startsWith(`${candidate.matchPrefix}/`),
  )
  if (matches.length === 0) return false
  const best = matches.reduce((a, b) => (a.matchPrefix.length >= b.matchPrefix.length ? a : b))
  return best.href === item.href
}

