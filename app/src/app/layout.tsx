import type { Metadata } from 'next'
import '@/styles/globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'PointsValue — Find the Real Value of Award Flights',
  description:
    'Instantly see if an award flight is a good deal. PointsValue bridges mileage costs with cash pricing to compute cents-per-mile values for every result.',
  keywords: [
    'award flights', 'points value', 'miles value', 'cents per mile',
    'CPM calculator', 'award travel', 'credit card points', 'flight deals',
    'mileage redemption', 'travel rewards',
  ],
  openGraph: {
    title: 'PointsValue — Find the Real Value of Award Flights',
    description:
      'Instantly see if an award flight is a good deal. PointsValue bridges mileage costs with cash pricing to compute cents-per-mile values.',
    url: 'https://pointsvalue.app',
    siteName: 'PointsValue',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PointsValue — Find the Real Value of Award Flights',
    description:
      'Instantly see if an award flight is a good deal. Compute the real cents-per-mile value of every award flight.',
  },
  metadataBase: new URL('https://pointsvalue.app'),
  alternates: { canonical: 'https://pointsvalue.app' },
  robots: { index: true, follow: true },
}

// Inline script to prevent dark mode flash — runs before React hydrates
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('pv-theme');
      if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Header />
        {children}
      </body>
    </html>
  )
}
