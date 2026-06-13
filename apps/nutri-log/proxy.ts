import { createAuthMiddleware } from '@rpgtracker/auth/middleware'
import { type NextRequest } from 'next/server'

const authMiddleware = createAuthMiddleware({ defaultTheme: 'minimal' })
const middleware = createAuthMiddleware({ defaultTheme: 'nutri-saas' })

export async function proxy(request: NextRequest) {
  return authMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
