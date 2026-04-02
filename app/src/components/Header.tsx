'use client'

/**
 * Header — Top navigation bar.
 *
 * Logo (left), theme toggle (right). Used on all pages.
 * Minimal — no sidebar nav per Aperture spec.
 */

import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
      <Link
        href="/"
        className="font-display text-[22px] text-text-primary hover:text-accent-primary transition-colors duration-200"
      >
        PointsValue
      </Link>
      <ThemeToggle />
    </header>
  )
}
