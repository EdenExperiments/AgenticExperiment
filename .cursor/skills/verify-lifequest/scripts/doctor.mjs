#!/usr/bin/env node
/**
 * Read-only readiness check for LifeQuest verification.
 * Usage:
 *   node .cursor/skills/verify-lifequest/scripts/doctor.mjs
 *   node .cursor/skills/verify-lifequest/scripts/doctor.mjs --full
 */
import { lifequestUrl, apiUrl } from './paths.mjs'

const full = process.argv.includes('--full')

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'manual' })
  const text = await res.text().catch(() => '')
  return { status: res.status, text, location: res.headers.get('location') }
}

function fail(msg) {
  console.error(`doctor: UNHEALTHY — ${msg}`)
  process.exit(1)
}

async function main() {
  let login
  try {
    login = await fetchText(`${lifequestUrl}/login`)
  } catch (err) {
    fail(`cannot reach ${lifequestUrl}/login (${err.message})`)
  }

  if (login.status !== 200) {
    fail(`${lifequestUrl}/login returned HTTP ${login.status}`)
  }

  const body = login.text
  const hasEmail = /email/i.test(body)
  const hasSignIn = /sign in/i.test(body)
  const hasBrand = /RPG Tracker|LifeQuest/i.test(body)
  if (!hasEmail || !hasSignIn || !hasBrand) {
    fail('login page missing expected Sign in / Email / brand text')
  }

  console.log(`doctor: LifeQuest OK at ${lifequestUrl}`)
  console.log('doctor: /login shows Email + Sign in + brand')

  if (full) {
    let health
    try {
      health = await fetchText(`${apiUrl}/health`)
    } catch (err) {
      fail(`API unreachable at ${apiUrl}/health (${err.message})`)
    }
    if (health.status !== 200) {
      fail(`API /health returned HTTP ${health.status}`)
    }
    console.log(`doctor: API OK at ${apiUrl}/health`)
  } else {
    console.log('doctor: skipped API check (pass --full to require it)')
  }

  console.log('doctor: HEALTHY')
}

main()
