import { useEffect, useState } from 'react'
import useUiStore from '@/store/uiStore'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const setOffline = useUiStore(s => s.setOffline)

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setOffline(false) }
    const handleOffline = () => { setIsOnline(false); setOffline(true) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])

  return isOnline
}
