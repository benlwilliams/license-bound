import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from '@/components/common/OfflineBanner'
import { Toaster } from '@/components/ui/sonner'
import useUiStore from '@/store/uiStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncOnReconnect } from '@/hooks/useSyncOnReconnect'

export default function AppShell() {
  const { darkMode } = useUiStore()

  // Keep dark class in sync on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useOnlineStatus()
  useSyncOnReconnect()

  return (
    <div className="flex flex-col min-h-svh bg-background text-foreground">
      <OfflineBanner />

      {/* Max-width container — full-width on mobile, centered on desktop */}
      <main className="flex-1 w-full max-w-md mx-auto pb-20 overflow-y-auto">
        <Outlet />
      </main>

      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  )
}
