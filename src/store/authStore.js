import { create } from 'zustand'
import { onAuthChange, auth, signInWithCustomToken } from '@/firebase/auth'

const useAuthStore = create((set) => ({
  user: null,
  familyId: null,
  loading: true,

  initAuth: () => {
    let cookieTried = false

    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        set({ user, familyId: user.uid, loading: false })
        return
      }

      // Firebase found no session — try the server-side session cookie once
      if (!cookieTried) {
        cookieTried = true
        try {
          const res = await fetch('/.netlify/functions/verify-session')
          if (res.ok) {
            const { customToken } = await res.json()
            // Signing in triggers onAuthStateChanged again with the user
            await signInWithCustomToken(auth, customToken)
            return
          }
        } catch {
          // Network error or function not available (dev mode) — fall through
        }
      }

      set({ user: null, familyId: null, loading: false })
    })

    return unsubscribe
  },
}))

export default useAuthStore
