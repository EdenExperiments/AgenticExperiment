import type { Skill, SkillDetail, Preset, Account, APIKeyStatus, APIError, XPLogResponse, CalibrateRequest, CalibrateResponse, ActivityEvent, TrainingSession, GateSubmission, XPChartResponse } from './types'

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
export function listSkills(): Promise<SkillDetail[]> {
  return request('/api/v1/skills')
}

export function getSkill(id: string): Promise<SkillDetail> {
  return request(`/api/v1/skills/${id}`)
}

export function createSkill(data: {
  name: string
  description?: string
  unit?: string
  preset_id?: string
  starting_level?: number
  gate_descriptions?: string[]
}): Promise<SkillDetail> {
  const entries: [string, string][] = []
  if (data.name) entries.push(['name', data.name])
  if (data.description) entries.push(['description', data.description])
  if (data.unit) entries.push(['unit', data.unit])
  if (data.preset_id) entries.push(['preset_id', data.preset_id])
  if (data.starting_level !== undefined) entries.push(['starting_level', String(data.starting_level)])
  if (data.gate_descriptions) entries.push(['gate_descriptions', JSON.stringify(data.gate_descriptions)])
  return request<SkillDetail>('/api/v1/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(entries).toString(),
  })
}

export function updateSkill(id: string, data: { name: string; description?: string }): Promise<SkillDetail> {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, string][]
  return request<SkillDetail>(`/api/v1/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(entries).toString(),
  })
}

export function deleteSkill(id: string): Promise<void> {
  return request(`/api/v1/skills/${id}`, { method: 'DELETE' })
}

export function logXP(skillId: string, xpDelta: number, logNote?: string): Promise<XPLogResponse> {
  const entries: [string, string][] = [['xp_delta', String(xpDelta)]]
  if (logNote) entries.push(['log_note', logNote])
  return request<XPLogResponse>(`/api/v1/skills/${skillId}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(entries).toString(),
  })
}

export function calibrateSkill(req: CalibrateRequest): Promise<CalibrateResponse> {
  return request<CalibrateResponse>('/api/v1/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name: req.name, description: req.description }).toString(),
  })
}

// Presets
export function getPresets(params: { category?: string; q?: string }): Promise<Preset[]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  return request<Preset[]>(`/api/v1/presets${qs ? `?${qs}` : ''}`)
}

// Account
export function getAccount(): Promise<Account> {
  return request<Account>('/api/v1/account')
}

// API Key
export function getAPIKeyStatus(): Promise<APIKeyStatus> {
  return request<APIKeyStatus>('/api/v1/account/api-key')
}

export function saveAPIKey(key: string): Promise<void> {
  return request('/api/v1/account/api-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: key }).toString(),
  })
}

export function deleteAPIKey(): Promise<void> {
  return request('/api/v1/account/api-key', { method: 'DELETE' })
}

export function signOut(): Promise<void> {
  return request('/api/v1/auth/signout', { method: 'POST' })
}

// Training Sessions
export function createSession(skillId: string, body: {
  status: 'completed' | 'abandoned'
  xp_delta?: number
  bonus_xp?: number
  duration_seconds: number
  log_note?: string
  reflection_what?: string
  reflection_how?: string
  reflection_feeling?: string
}): Promise<TrainingSession> {
  return request<TrainingSession>(`/api/v1/skills/${skillId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function listSessions(skillId: string, params?: { limit?: number; offset?: number }): Promise<TrainingSession[]> {
  const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  return request<TrainingSession[]>(`/api/v1/skills/${skillId}/sessions${qs ? `?${qs}` : ''}`)
}

export function getXPChart(skillId: string, days?: number): Promise<XPChartResponse> {
  const qs = days ? `?days=${days}` : ''
  return request<XPChartResponse>(`/api/v1/skills/${skillId}/xp-chart${qs}`)
}

// Gate submissions
export function submitGate(gateId: string, body: {
  path: 'ai' | 'self_report'
  evidence_what?: string
  evidence_how?: string
  evidence_feeling?: string
}): Promise<GateSubmission> {
  return request<GateSubmission>(`/api/v1/gates/${gateId}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Account update
export function updateAccount(data: { timezone?: string; display_name?: string }): Promise<Account> {
  return request<Account>('/api/v1/account', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Activity
export function getActivity(limit?: number, skillId?: string): Promise<ActivityEvent[]> {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  if (skillId) params.set('skill_id', skillId)
  const qs = params.toString()
  return request<ActivityEvent[]>(`/api/v1/activity${qs ? `?${qs}` : ''}`)
}
