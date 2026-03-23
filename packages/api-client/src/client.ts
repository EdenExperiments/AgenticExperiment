import type { Skill, SkillDetail, Preset, Account, APIKeyStatus, APIError, XPLogResponse, CalibrateRequest, CalibrateResponse, ActivityEvent, TrainingSession, GateSubmission, XPChartResponse, Tag, TagWithCount, SkillCategory } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (res.status === 204) {
    return undefined as unknown as T
  }
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
  category_id?: string
  starting_level?: number
  gate_descriptions?: string[]
}): Promise<SkillDetail> {
  const entries: [string, string][] = []
  if (data.name) entries.push(['name', data.name])
  if (data.description) entries.push(['description', data.description])
  if (data.unit) entries.push(['unit', data.unit])
  if (data.preset_id) entries.push(['preset_id', data.preset_id])
  if (data.category_id) entries.push(['category_id', data.category_id])
  if (data.starting_level !== undefined) entries.push(['starting_level', String(data.starting_level)])
  if (data.gate_descriptions) entries.push(['gate_descriptions', JSON.stringify(data.gate_descriptions)])
  return request<SkillDetail>('/api/v1/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(entries).toString(),
  })
}

export function updateSkill(id: string, data: { name: string; description?: string; category_id?: string | null }): Promise<SkillDetail> {
  const entries: [string, string][] = []
  entries.push(['name', data.name])
  if (data.description !== undefined) entries.push(['description', data.description])
  if (data.category_id !== undefined) entries.push(['category_id', data.category_id ?? ''])
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
  session_type?: 'pomodoro' | 'manual'
  status: 'completed' | 'partial' | 'abandoned'
  xp_delta?: number
  planned_duration_sec?: number
  actual_duration_sec?: number
  log_note?: string
  reflection_what?: string
  reflection_how?: string
  reflection_feeling?: string
  pomodoro_work_sec?: number
  pomodoro_break_sec?: number
  pomodoro_intervals_completed?: number
  pomodoro_intervals_planned?: number
}): Promise<{ session: TrainingSession; xp_result: unknown; streak: unknown }> {
  const entries: [string, string][] = [
    ['session_type', body.session_type ?? 'pomodoro'],
    ['status', body.status],
  ]
  if (body.xp_delta !== undefined) entries.push(['xp_delta', String(body.xp_delta)])
  if (body.planned_duration_sec !== undefined) entries.push(['planned_duration_sec', String(body.planned_duration_sec)])
  if (body.actual_duration_sec !== undefined) entries.push(['actual_duration_sec', String(body.actual_duration_sec)])
  if (body.log_note) entries.push(['log_note', body.log_note])
  if (body.reflection_what) entries.push(['reflection_what', body.reflection_what])
  if (body.reflection_how) entries.push(['reflection_how', body.reflection_how])
  if (body.reflection_feeling) entries.push(['reflection_feeling', body.reflection_feeling])
  if (body.pomodoro_work_sec !== undefined) entries.push(['pomodoro_work_sec', String(body.pomodoro_work_sec)])
  if (body.pomodoro_break_sec !== undefined) entries.push(['pomodoro_break_sec', String(body.pomodoro_break_sec)])
  if (body.pomodoro_intervals_completed !== undefined) entries.push(['pomodoro_intervals_completed', String(body.pomodoro_intervals_completed)])
  if (body.pomodoro_intervals_planned !== undefined) entries.push(['pomodoro_intervals_planned', String(body.pomodoro_intervals_planned)])
  return request(`/api/v1/skills/${skillId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(entries).toString(),
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
  return request<GateSubmission>(`/api/v1/blocker-gates/${gateId}/submit`, {
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

// Favourites
export function toggleFavourite(skillId: string): Promise<{ is_favourite: boolean }> {
  return request(`/api/v1/skills/${skillId}/favourite`, { method: 'PATCH' })
}

// Tags
export function setSkillTags(skillId: string, tagNames: string[]): Promise<Tag[]> {
  return request<Tag[]>(`/api/v1/skills/${skillId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ tag_names: tagNames.join(',') }).toString(),
  })
}

export function listTags(): Promise<TagWithCount[]> {
  return request<TagWithCount[]>('/api/v1/tags')
}

// Categories
export function listCategories(): Promise<SkillCategory[]> {
  return request<SkillCategory[]>('/api/v1/categories')
}

// Activity
export function getActivity(limit?: number, skillId?: string): Promise<ActivityEvent[]> {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  if (skillId) params.set('skill_id', skillId)
  const qs = params.toString()
  return request<ActivityEvent[]>(`/api/v1/activity${qs ? `?${qs}` : ''}`)
}
