#!/usr/bin/env node
/**
 * Drive one mapped LifeQuest feature and write proof artifacts.
 * Usage:
 *   node .cursor/skills/verify-lifequest/scripts/drive.mjs auth-login
 *
 * Resolves Playwright from apps/rpg-tracker.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { lifequestUrl, featureArtifactDir, repoRoot } from './paths.mjs'

const featureId = process.argv[2]
if (!featureId) {
  console.error('usage: node drive.mjs <feature-id>')
  process.exit(1)
}

const require = createRequire(path.join(repoRoot, 'apps', 'rpg-tracker', 'package.json'))
// apps/rpg-tracker depends on @playwright/test (pnpm does not hoist bare `playwright` here)
const { chromium } = require('@playwright/test')

async function driveAuthLogin(page, outDir) {
  const meta = {
    featureId: 'auth-login',
    entryPoints: ['/dashboard redirect', '/login form', '/register link'],
    lifequestUrl,
    startedAt: new Date().toISOString(),
  }

  // Unauthenticated redirect
  await page.goto(`${lifequestUrl}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/login/)
  await page.screenshot({ path: path.join(outDir, '01-redirect-to-login.png'), fullPage: true })
  fs.writeFileSync(path.join(outDir, '01-redirect-to-login.aria.txt'), await page.locator('body').ariaSnapshot())

  // Login form
  await page.goto(`${lifequestUrl}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /RPG Tracker/i }).waitFor()
  await page.getByLabel(/email/i).waitFor()
  await page.getByLabel(/password/i).waitFor()
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor()
  await page.getByRole('link', { name: /create account/i }).waitFor()
  await page.screenshot({ path: path.join(outDir, '02-login-form.png'), fullPage: true })
  fs.writeFileSync(path.join(outDir, '02-login-form.aria.txt'), await page.locator('body').ariaSnapshot())

  // Register entry
  await page.getByRole('link', { name: /create account/i }).click()
  await page.waitForURL(/\/register/)
  await page.getByRole('button', { name: /create account/i }).waitFor()
  await page.screenshot({ path: path.join(outDir, '03-register-form.png'), fullPage: true })
  fs.writeFileSync(path.join(outDir, '03-register-form.aria.txt'), await page.locator('body').ariaSnapshot())

  // Invalid credentials → alert (real auth path; no session created)
  await page.goto(`${lifequestUrl}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel(/email/i).fill('verify-lifequest-invalid@example.com')
  await page.getByLabel(/password/i).fill('definitely-wrong-password-xxx')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('alert').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(outDir, '04-invalid-credentials.png'), fullPage: true })
  fs.writeFileSync(path.join(outDir, '04-invalid-credentials.aria.txt'), await page.locator('body').ariaSnapshot())

  meta.finishedAt = new Date().toISOString()
  meta.result = 'ok'
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2))
}

async function main() {
  const outDir = featureArtifactDir(featureId)
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  try {
    if (featureId === 'auth-login') {
      await driveAuthLogin(page, outDir)
    } else {
      console.error(`drive: feature "${featureId}" has no automated recipe yet; follow features/${featureId}.md manually and write artifacts under ${outDir}`)
      process.exit(2)
    }
  } finally {
    await browser.close()
  }

  console.log(`drive: proof written to ${outDir}`)
}

main().catch((err) => {
  console.error(`drive: failed — ${err.message}`)
  process.exit(1)
})
