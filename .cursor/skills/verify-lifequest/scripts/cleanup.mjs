#!/usr/bin/env node
/**
 * Tear down processes recorded by launch.mjs. Does not delete artifacts.
 * Usage:
 *   node .cursor/skills/verify-lifequest/scripts/cleanup.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { statePath, runDir, repoRoot } from './paths.mjs'

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } else {
      process.kill(pid, 'SIGTERM')
    }
    console.log(`cleanup: killed pid ${pid}`)
  } catch {
    console.log(`cleanup: pid ${pid} already gone`)
  }
}

function main() {
  if (!fs.existsSync(statePath)) {
    console.log('cleanup: no .run/state.json — nothing to stop')
    return
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  for (const entry of state.pids || []) {
    killPid(entry.pid)
  }

  if (state.startedDb) {
    try {
      execSync('docker compose stop db', { cwd: repoRoot, stdio: 'inherit' })
      console.log('cleanup: stopped db container (volume preserved)')
    } catch (err) {
      console.error(`cleanup: could not stop db: ${err.message}`)
    }
  }

  fs.rmSync(runDir, { recursive: true, force: true })
  console.log('cleanup: removed .run state; artifacts preserved')
}

main()
