'use client'

import { useQuery } from '@tanstack/react-query'
import { getAIEntitlement } from '@rpgtracker/api-client'
import type { AIEntitlement } from '@rpgtracker/api-client'

export interface AIEntitlementState {
  entitled: boolean
  isLoading: boolean
  reason: AIEntitlement['reason'] | null
}

export function useAIEntitlement(): AIEntitlementState {
  const { data, isLoading } = useQuery<AIEntitlement>({
    queryKey: ['ai-entitlement'],
    queryFn: getAIEntitlement,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return { entitled: false, isLoading: true, reason: null }
  }

  return {
    entitled: data?.entitled ?? false,
    isLoading: false,
    reason: data?.reason ?? 'unknown',
  }
}

export function isEntitlementError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 403
  }
  if (error instanceof Error) {
    return error.message.includes('403') || error.message.toLowerCase().includes('forbidden')
  }
  return false
}
