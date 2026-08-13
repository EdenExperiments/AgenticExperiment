import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const skillRoot = path.resolve(__dirname, '..')
export const repoRoot = path.resolve(skillRoot, '../../..')
export const runDir = path.join(skillRoot, '.run')
export const statePath = path.join(runDir, 'state.json')
export const artifactsRoot = path.join(skillRoot, 'artifacts')

export const lifequestUrl = (process.env.LIFEQUEST_URL || 'http://localhost:3000').replace(/\/$/, '')
export const apiUrl = (process.env.LIFEQUEST_API_URL || 'http://localhost:8080').replace(/\/$/, '')

export function featureArtifactDir(featureId) {
  return path.join(artifactsRoot, featureId)
}
