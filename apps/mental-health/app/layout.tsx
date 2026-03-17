import type { Metadata } from 'next'
import { ThemeProvider } from '@rpgtracker/ui'
import { cookies } from 'next/headers'
import type { Theme } from '@rpgtracker/ui'
import '../tokens.css'

export const metadata: Metadata = {
  title: 'Mental Health',
  description: 'Mental wellness tracking',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'mental-calm') as Theme

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
