import React from 'react'
const Link = ({ href, children, className, 'aria-label': ariaLabel, 'aria-current': ariaCurrent }: any) => (
  <a href={href} className={className} aria-label={ariaLabel} aria-current={ariaCurrent}>{children}</a>
)
export default Link
