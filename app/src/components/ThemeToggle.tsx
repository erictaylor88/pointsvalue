'use client'

/**
 * ThemeToggle — Light/Dark mode switcher.
 *
 * Uses localStorage to persist preference, falls back to system preference.
 * Applies `.dark` class to <html> element per Tailwind darkMode: 'class'.
 */

import { useState, useEffect, useCallback } from 'react'

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.7 3.7L4.76 4.76M13.24 13.24L14.3 14.3M14.3 3.7L13.24 4.76M4.76 13.24L3.7 14.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.32 11.68A7.5 7.5 0 016.32 2.68 7.5 7.5 0 1015.32 11.68z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('pv-theme')
    if (stored === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (prefersDark) document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('pv-theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('pv-theme', 'light')
      }
      return next
    })
  }, [])

  if (!mounted) {
    return <div className="w-9 h-9" /> // Prevent layout shift
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="
        w-9 h-9 flex items-center justify-center rounded-full
        text-text-tertiary hover:text-text-primary
        hover:bg-bg-subtle
        transition-colors duration-200 ease-smooth
      "
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
