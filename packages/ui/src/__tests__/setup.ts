import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

let lastCookieAssignment = ''
const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get() { return lastCookieAssignment || cookieDescriptor?.get?.call(document) || '' },
  set(value: string) { lastCookieAssignment = value; cookieDescriptor?.set?.call(document, value) },
})
beforeEach(() => { lastCookieAssignment = ''; cookieDescriptor?.set?.call(document, '') })
