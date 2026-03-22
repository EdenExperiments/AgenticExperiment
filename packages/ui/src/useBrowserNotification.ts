'use client'

import { useCallback } from 'react'

interface NotifyOptions {
  title: string
  body?: string
}

export function useBrowserNotification() {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  const permission = isSupported ? Notification.permission : 'default'

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'default' as NotificationPermission
    return Notification.requestPermission()
  }, [isSupported])

  const notify = useCallback(({ title, body }: NotifyOptions) => {
    if (!isSupported) return
    if (Notification.permission !== 'granted') return
    new Notification(title, { body })
  }, [isSupported])

  return { isSupported, permission, requestPermission, notify }
}
