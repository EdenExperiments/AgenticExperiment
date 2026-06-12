import { vi } from 'vitest'

export class NextRequest {
  url: string
  nextUrl: URL
  cookies = {
    get: () => undefined,
    getAll: () => [] as { name: string; value: string }[],
  }

  constructor(url: string) {
    this.url = url
    this.nextUrl = new URL(url)
  }
}

export class NextResponse {
  static next() {
    return new NextResponse()
  }

  static redirect(url: URL | string) {
    const response = new NextResponse()
    response.headers = new Headers({ location: String(url) })
    return response
  }

  headers = new Headers()
  cookies = {
    set: vi.fn(),
    get: vi.fn(),
  }
}
