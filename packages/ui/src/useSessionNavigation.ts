'use client'

import { useParams, useSearchParams } from 'next/navigation'

export function useSessionNavigation() {
  const params = useParams()
  const searchParams = useSearchParams()

  const skillId = params.id as string
  const from = searchParams.get('from')
  const entryPoint = from === 'dashboard' ? 'dashboard' : 'skill'
  const returnUrl = entryPoint === 'dashboard' ? '/dashboard' : `/skills/${skillId}`

  return { skillId, entryPoint, returnUrl }
}
