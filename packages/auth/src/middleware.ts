import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Theme } from '@rpgtracker/ui'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]

interface MiddlewareOptions {
  /** Routes that are public (no auth redirect). Default: /login, /register */
  publicRoutes?: string[]
  /** Default theme for unauthenticated users */
  defaultTheme: Theme
}

/**
 * Creates a Next.js middleware function that:
 * 1. Validates Supabase session and redirects unauthenticated users to /login
 * 2. Reads theme preference from cookie and sets it on the response
 */
export function createAuthMiddleware(options: MiddlewareOptions) {
  const publicRoutes = options.publicRoutes ?? ['/login', '/register']

  return async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    const pathname = request.nextUrl.pathname
    const isPublic = publicRoutes.some(r => pathname.startsWith(r))

    // Redirect unauthenticated users away from protected routes
    if (!session && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from auth pages
    if (session && isPublic) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Apply theme: if no theme cookie yet, set it so SSR layout can read it without a DB call
    const themeCookie = request.cookies.get('rpgt-theme')?.value as Theme | undefined
    if (!themeCookie) {
      response.cookies.set('rpgt-theme', options.defaultTheme, {
        httpOnly: false,  // must be readable by JS for client-side ThemeProvider sync
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,  // 1 year
      })
    }

    return response
  }
}
