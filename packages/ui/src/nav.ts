export type NavItem = {
  label: string
  href: string | null
  icon: string
  matchPrefix: string
}

export function isNavItemActive(item: NavItem, currentPath: string, items: NavItem[]): boolean {
  if (item.href === null || !currentPath.startsWith(item.matchPrefix)) {
    return false
  }
  const longer = items.some(
    (other) =>
      other.href !== null &&
      other.matchPrefix.length > item.matchPrefix.length &&
      currentPath.startsWith(other.matchPrefix),
  )
  return !longer
}

