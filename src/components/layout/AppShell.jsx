import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from '@/components/common/OfflineBanner'
import { Toaster } from '@/components/ui/sonner'
import useUiStore from '@/store/uiStore'
import useSessionStore from '@/store/sessionStore'
import useAuthStore from '@/store/authStore'
import { getActiveSession, deleteActiveSession } from '@/firebase/firestore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncOnReconnect } from '@/hooks/useSyncOnReconnect'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export default function AppShell() {
  const { darkMode } = useUiStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeSession, startActiveSession } = useSessionStore()
  const { familyId } = useAuthStore()

  // Keep dark class in sync on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // On app restart (e.g. iOS killed the PWA during a drive), resume the live
  // session rather than silently losing it.
  //
  // Stage 1 — localStorage: Zustand's persist middleware survives most restarts.
  // Stage 2 — Firestore: if iOS also wiped localStorage, the cloud backup doc
  //   at families/{familyId}/active_session/current is the last line of defense.
  useEffect(() => {
    if (!familyId) return

    // Stage 1: localStorage still has the session
    if (activeSession) {
      if (location.pathname === '/session/live') return
      const ageMs = Date.now() - (activeSession.startedAt ?? 0)
      if (ageMs <= FOUR_HOURS_MS) navigate('/session/live', { replace: true })
      return
    }

    // Stage 2: localStorage was cleared — check Firestore backup
    getActiveSession(familyId)
      .then(cloudSession => {
        if (!cloudSession) return
        const ageMs = Date.now() - (cloudSession.startedAt ?? 0)
        if (ageMs > FOUR_HOURS_MS) {
          deleteActiveSession(familyId).catch(() => {})
          return
        }
        startActiveSession(cloudSession)
        navigate('/session/live', { replace: true })
      })
      .catch(() => {}) // non-fatal if offline
  }, [familyId])

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
