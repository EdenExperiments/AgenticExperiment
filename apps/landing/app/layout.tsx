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
  title: 'RpgTracker — Level Up Your Life',
  description:
    'A self-improvement platform that turns real-world effort into RPG progression. Track skills, earn XP, break through tier gates, and level up your life.',
  openGraph: {
    title: 'RpgTracker — Level Up Your Life',
    description:
      'Track skills, earn XP, and break through tier gates. A dark-fantasy self-improvement platform.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
