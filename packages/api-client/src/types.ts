export interface Skill {
  id: string
  user_id: string
  name: string
  description: string
  unit: string
  preset_id: string | null
  current_xp: number
  current_level: number
  created_at: string
}

export interface Preset {
  id: string
  name: string
  description: string
  unit: string
  category_id: string
  category_name: string
  category_slug: string
}

export interface Account {
  id: string
  email: string
  display_name: string | null
}

export interface APIKeyStatus {
  has_key: boolean
}

export interface APIError {
  error: string
}
