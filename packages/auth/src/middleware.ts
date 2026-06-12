import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Theme, type VisualMode } from '@rpgtracker/ui'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]
type HeadersToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[1]

interface MiddlewareOptions {
  /** Routes that are public (no auth redirect). Default: /login, /register */
  publicRoutes?: string[]
  /** Default theme for unauthenticated users */
  defaultTheme: Theme
  defaultMode?: VisualMode
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
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: CookieToSet[], headers: HeadersToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
            Object.entries(headers).forEach(([name, value]) => {
              response.headers.set(name, value)
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

    const cookieOptions = {
      httpOnly: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    }

    const themeCookie = request.cookies.get('rpgt-theme')?.value as Theme | undefined
    if (!themeCookie) {
      response.cookies.set('rpgt-theme', options.defaultTheme, cookieOptions)
    }

    const modeCookie = request.cookies.get('rpgt-mode')?.value as VisualMode | undefined
    if (!modeCookie) {
      response.cookies.set('rpgt-mode', options.defaultMode ?? 'clean', cookieOptions)
    }

    return response
  }
}
