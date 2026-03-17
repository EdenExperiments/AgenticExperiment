import type { Skill, Preset, Account, APIKeyStatus, APIError } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as APIError).error ?? 'request failed')
  }
  return data as T
}

// Skills
export function createSkill(body: { name: string; description?: string; unit: string; preset_id?: string }): Promise<Skill> {
  // Filter undefined values — URLSearchParams would stringify them as the literal string "undefined"
  const entries = Object.entries(body).filter(([, v]) => v !== undefined) as [string, string][]
  const form = new URLSearchParams(entries)
  return request<Skill>('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
}

// Presets
export function getPresets(params: { category?: string; q?: string }): Promise<Preset[]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  return request<Preset[]>(`/api/presets${qs ? `?${qs}` : ''}`)
}

// Account
export function getAccount(): Promise<Account> {
  return request<Account>('/api/account')
}

// API Key
export function getAPIKeyStatus(): Promise<APIKeyStatus> {
  return request<APIKeyStatus>('/api/account/api-key')
}

export function saveAPIKey(key: string): Promise<void> {
  return request('/api/account/api-key', {
    method: 'PUT',
    body: JSON.stringify({ api_key: key }),
  })
}

export function deleteAPIKey(): Promise<void> {
  return request('/api/account/api-key', { method: 'DELETE' })
}
