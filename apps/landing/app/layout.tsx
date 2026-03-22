import type { Metadata } from 'next'
import { Inter, Press_Start_2P, Space_Grotesk, Rajdhani } from 'next/font/google'
import { ThemeProvider } from '@rpgtracker/ui'
import './landing-tokens.css'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-inter',
  display: 'swap',
})

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-press-start',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

const fontClassNames = [
  inter.variable,
  pressStart2P.variable,
  spaceGrotesk.variable,
  rajdhani.variable,
].join(' ')

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
    <html lang="en" data-theme="retro" className={fontClassNames} suppressHydrationWarning>
      <body>
        <ThemeProvider theme="retro">
          <a href="#main-content" className="skip-link">Skip to content</a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
