'use client'

import { useEffect, useRef, useState } from 'react'

export default function Navbar() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef<HTMLUListElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Focus management when menu opens/closes
  useEffect(() => {
    if (menuOpen) {
      const firstLink = menuRef.current?.querySelector('a') as HTMLElement | null
      firstLink?.focus()
    } else {
      toggleRef.current?.focus()
    }
  }, [menuOpen])

  // Escape key closes menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} role="navigation">
      <div className="navbar-inner">
        <a href="#" className="navbar-logo">
          <span aria-hidden="true">⚔</span>
          <span>RpgTracker</span>
        </a>

        <ul ref={menuRef} className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#apps" onClick={() => setMenuOpen(false)}>The Suite</a></li>
          <li><a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a></li>
          <li>
            <a href={`${appUrl}/login`} onClick={() => setMenuOpen(false)}>Sign In</a>
          </li>
          <li>
            <a
              href={`${appUrl}/register`}
              className="btn-ghost"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.65rem' }}
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </a>
          </li>
        </ul>

        <button
          ref={toggleRef}
          className="navbar-mobile-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="16" x2="19" y2="16" />
              </>
            )}
          </svg>
        </button>
      </div>
    </nav>
  )
}
