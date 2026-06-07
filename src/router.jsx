import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'

import AppShell from '@/components/layout/AppShell'
import Auth from '@/screens/Auth'
import Dashboard from '@/screens/Dashboard'
import SessionHistory from '@/screens/SessionHistory'
import SessionDetail from '@/screens/SessionDetail'
import ManualEntry from '@/screens/ManualEntry'
import PreSession from '@/screens/PreSession'
import LiveSession from '@/screens/LiveSession'
import SessionSummary from '@/screens/SessionSummary'
import Profiles from '@/screens/Profiles'
import RoadTestReadiness from '@/screens/RoadTestReadiness'
import PDFExport from '@/screens/PDFExport'
import Settings from '@/screens/Settings'
import LogImport from '@/screens/LogImport'

function AuthGate({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function Router() {
  const initAuth = useAuthStore(s => s.initAuth)
  const { darkMode } = useUiStore()

  useEffect(() => {
    // Apply stored dark mode preference on first load
    document.documentElement.classList.toggle('dark', darkMode)
    // Start Firebase auth listener
    const unsubscribe = initAuth()

    // Show session cookie diagnostic result left by the sign-in page before its redirect
    const diag = localStorage.getItem('lb_auth_diag')
    if (diag) {
      localStorage.removeItem('lb_auth_diag')
      if (diag === 'ok') {
        toast.success('Session cookie verified ✓', { duration: 4000 })
      } else {
        toast.error(`Session cookie issue: ${diag}`, { duration: 10000 })
      }
    }

    return unsubscribe
  }, [])

  return (
    <HashRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          element={
            <AuthGate>
              <AppShell />
            </AuthGate>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<SessionHistory />} />
          <Route path="/session-detail" element={<SessionDetail />} />
          <Route path="/manual-entry" element={<ManualEntry />} />
          <Route path="/session/pre" element={<PreSession />} />
          <Route path="/session/live" element={<LiveSession />} />
          <Route path="/session/summary" element={<SessionSummary />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/readiness" element={<RoadTestReadiness />} />
          <Route path="/export" element={<PDFExport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<LogImport />} />
        </Route>

        {/* Catch-all → dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
