import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'PointsValue — Find the Real Value of Award Flights',
  description:
    'Instantly see if an award flight is a good deal. PointsValue bridges mileage costs with cash pricing to compute cents-per-mile values for every result.',
  openGraph: {
    title: 'PointsValue — Find the Real Value of Award Flights',
    description:
      'Instantly see if an award flight is a good deal. PointsValue bridges mileage costs with cash pricing to compute cents-per-mile values.',
    url: 'https://pointsvalue.app',
    siteName: 'PointsValue',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload primary fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Satoshi from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
