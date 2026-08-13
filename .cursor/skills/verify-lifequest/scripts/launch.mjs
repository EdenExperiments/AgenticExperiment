#!/usr/bin/env node
/**
 * Start LifeQuest for verification and record PIDs for cleanup.
 * Usage:
 *   node .cursor/skills/verify-lifequest/scripts/launch.mjs --frontend-only
 *   node .cursor/skills/verify-lifequest/scripts/launch.mjs
 */
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, runDir, statePath, lifequestUrl, apiUrl } from './paths.mjs'

const frontendOnly = process.argv.includes('--frontend-only')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitFor(url, { okStatuses = [200], timeoutMs = 120_000 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (okStatuses.includes(res.status)) return
    } catch {
      // retry
    }
    await sleep(1500)
  }
  throw new Error(`timeout waiting for ${url}`)
}

function spawnLogged(commandLine, { cwd, env, role } = {}) {
  const child = spawn(commandLine, {
    cwd: cwd || repoRoot,
    env: { ...process.env, ...env },
    shell: true,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logPath = path.join(runDir, `${role || 'proc'}-${child.pid}.log`)
  const log = fs.createWriteStream(logPath)
  child.stdout.pipe(log)
  child.stderr.pipe(log)
  return { pid: child.pid, child, logPath, command: commandLine }
}

async function main() {
  if (fs.existsSync(statePath)) {
    console.error('launch: .run/state.json already exists. Run cleanup.mjs first (or delete .run if stale).')
    process.exit(1)
  }

  fs.mkdirSync(runDir, { recursive: true })

  // Refuse to hijack an already-serving instance
  try {
    const res = await fetch(`${lifequestUrl}/login`, { redirect: 'manual' })
    if (res.status === 200) {
      console.error(`launch: ${lifequestUrl} already responds. Refuse to double-drive. Stop it or set LIFEQUEST_URL.`)
      process.exit(1)
    }
  } catch {
    // nothing listening — good
  }

  const state = {
    startedAt: new Date().toISOString(),
    lifequestUrl,
    apiUrl,
    frontendOnly,
    pids: [],
    startedDb: false,
  }

  if (!frontendOnly) {
    console.log('launch: ensuring postgres via docker compose…')
    execSync('docker compose up -d db', { cwd: repoRoot, stdio: 'inherit' })
    state.startedDb = true

    console.log('launch: starting Go API…')
    const api = spawnLogged('make run', { cwd: path.join(repoRoot, 'apps', 'api'), role: 'api' })
    state.pids.push({ role: 'api', pid: api.pid, logPath: api.logPath, command: api.command })
    await waitFor(`${apiUrl}/health`, { timeoutMs: 180_000 })
    console.log('launch: API ready')
  }

  console.log('launch: starting LifeQuest (pnpm --filter rpg-tracker dev)…')
  const fe = spawnLogged('pnpm --filter rpg-tracker dev', { cwd: repoRoot, role: 'frontend' })
  state.pids.push({ role: 'frontend', pid: fe.pid, logPath: fe.logPath, command: fe.command })
  // Keep children alive by not exiting — write state then wait for ready and detach note
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))

  await waitFor(`${lifequestUrl}/login`, { timeoutMs: 180_000 })
  // refresh state in case
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  console.log(`launch: READY at ${lifequestUrl}`)
  console.log(`launch: state written to ${statePath}`)
  console.log('launch: leave this process running; use cleanup.mjs in another terminal when done.')

  // Hold the parent so spawned children (non-detached) stay supervised on some platforms
  await new Promise(() => {})
}

main().catch((err) => {
  console.error(`launch: failed — ${err.message}`)
  process.exit(1)
})
