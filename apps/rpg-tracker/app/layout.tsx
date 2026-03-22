import type { Metadata } from 'next'
import { Inter, Press_Start_2P, Space_Grotesk, Rajdhani } from 'next/font/google'
import { ThemeProvider } from '@rpgtracker/ui'
import { cookies } from 'next/headers'
import type { Theme } from '@rpgtracker/ui'
import { Providers } from './providers'
import '../tokens.css'

export const metadata: Metadata = {
  title: 'LifeQuest',
  description: 'Gamified skill progression',
}

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'minimal') as Theme

  return (
    <html lang="en" data-theme={theme} className={fontClassNames} suppressHydrationWarning>
      <body>
        <ThemeProvider theme={theme}>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
