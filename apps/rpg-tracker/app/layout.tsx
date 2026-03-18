import type { Metadata } from 'next'
import { ThemeProvider } from '@rpgtracker/ui'
import { cookies } from 'next/headers'
import type { Theme } from '@rpgtracker/ui'
import { Providers } from './providers'
import '../tokens.css'

export const metadata: Metadata = {
  title: 'LifeQuest',
  description: 'Gamified skill progression',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'rpg-game') as Theme

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
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
