import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700', '900'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3001'),
  title: 'RpgTracker — Level Up Your Life',
  description:
    'A self-improvement platform that turns real-world effort into RPG progression. Track skills, earn XP, break through tier gates, and level up your life.',
  openGraph: {
    title: 'RpgTracker — Level Up Your Life',
    description:
      'Track skills, earn XP, and break through tier gates. A dark-fantasy self-improvement platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RpgTracker — Level Up Your Life',
    description:
      'Track skills, earn XP, and break through tier gates. A dark-fantasy self-improvement platform.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  )
}
