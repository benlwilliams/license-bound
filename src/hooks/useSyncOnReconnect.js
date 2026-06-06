import { useEffect, useRef } from 'react'
import { syncPendingSessions } from '@/services/sync'
import useAuthStore from '@/store/authStore'

export function useSyncOnReconnect() {
  const familyId = useAuthStore(s => s.familyId)
  const wasOnline = useRef(navigator.onLine)

  useEffect(() => {
    // Sync on startup if already online
    if (familyId && navigator.onLine) {
      syncPendingSessions(familyId)
    }

    const handle = () => {
      if (!wasOnline.current && familyId) {
        syncPendingSessions(familyId)
      }
      wasOnline.current = true
    }

    const handleOffline = () => { wasOnline.current = false }

    window.addEventListener('online', handle)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handle)
      window.removeEventListener('offline', handleOffline)
    }
  }, [familyId])
}
