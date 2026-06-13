import { type NextRequest, NextResponse } from 'next/server'
import { type Theme, type VisualMode } from '@rpgtracker/ui'
import { updateSession } from './updateSession'

interface MiddlewareOptions {
  /** Routes that are public (no auth redirect). Default: /login, /register */
  publicRoutes?: string[]
  /** Default theme for unauthenticated users */
  defaultTheme: Theme
  defaultMode?: VisualMode
}

function copyResponseCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value)
  })
}

/**
 * Next.js proxy/middleware: refresh Supabase session cookies, then enforce route auth.
 */
export function createAuthMiddleware(options: MiddlewareOptions) {
  const publicRoutes = options.publicRoutes ?? ['/login', '/register', '/auth']

  return async function middleware(request: NextRequest) {
    const { response: supabaseResponse, claims } = await updateSession(request)
    const isAuthenticated = Boolean(claims?.sub)

    const pathname = request.nextUrl.pathname
    const isPublic = publicRoutes.some(r => pathname.startsWith(r))

    if (!isAuthenticated && !isPublic) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      copyResponseCookies(supabaseResponse, redirect)
      return redirect
    }

    if (isAuthenticated && isPublic) {
      const redirect = NextResponse.redirect(new URL('/dashboard', request.url))
      copyResponseCookies(supabaseResponse, redirect)
      return redirect
    }

    const cookieOptions = {
      httpOnly: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    }

    const themeCookie = request.cookies.get('rpgt-theme')?.value as Theme | undefined
    if (!themeCookie) {
      supabaseResponse.cookies.set('rpgt-theme', options.defaultTheme, cookieOptions)
    }

    const modeCookie = request.cookies.get('rpgt-mode')?.value as VisualMode | undefined
    if (!modeCookie) {
      supabaseResponse.cookies.set('rpgt-mode', options.defaultMode ?? 'clean', cookieOptions)
    }

    return supabaseResponse
  }
}
