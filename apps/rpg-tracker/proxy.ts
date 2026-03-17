import { createAuthMiddleware } from '@rpgtracker/auth/middleware'
import { type NextRequest } from 'next/server'

const middleware = createAuthMiddleware({ defaultTheme: 'rpg-game' })

export default function (request: NextRequest) {
  return middleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
