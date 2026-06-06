import { create } from 'zustand'
import {
  getSessions as cloudGetSessions,
  saveSession as cloudSaveSession,
  updateSession as cloudUpdateSession,
  deleteSession as cloudDeleteSession,
} from '@/firebase/firestore'
import {
  saveSessionOffline,
  getSessionsOffline,
  updateSessionOffline,
  deleteSessionOffline,
} from '@/db/offlineDB'

const useSessionStore = create((set, get) => ({
  // All loaded sessions keyed by driverId
  sessionsByDriver: {},
  loading: false,
  error: null,

  // Active live session state
  activeSession: null,

  // ── Load ──────────────────────────────────────────────────────────────────
  //
  // Strategy: try Firestore (source of truth). On success, cache to Dexie.
  // If Firestore is unreachable (offline), fall back to Dexie.

  loadSessions: async (familyId, driverId) => {
    set({ loading: true, error: null })
    try {
      const sessions = await cloudGetSessions(familyId, driverId)

      // Cache cloud results to Dexie so they're available offline
      for (const session of sessions) {
        await saveSessionOffline({ ...session, syncedToCloud: 1 })
      }

      set(state => ({
        sessionsByDriver: { ...state.sessionsByDriver, [driverId]: sessions },
        loading: false,
      }))
    } catch {
      // Firestore unreachable — serve from local Dexie cache
      try {
        const sessions = await getSessionsOffline(driverId)
        set(state => ({
          sessionsByDriver: { ...state.sessionsByDriver, [driverId]: sessions },
          loading: false,
        }))
      } catch (offlineErr) {
        set({ loading: false, error: offlineErr.message })
      }
    }
  },

  // ── Save ──────────────────────────────────────────────────────────────────
  //
  // Strategy: generate a stable ID locally, write to Dexie immediately
  // (visible to the user right away), then push to Firestore in the
  // background. If offline, Dexie holds it with syncedToCloud: 0 and
  // syncPendingSessions() will push it when connectivity returns.

  saveSession: async (familyId, session) => {
    const id = session.sessionId || crypto.randomUUID()
    const full = { ...session, sessionId: id, syncedToCloud: false }

    // 1. Persist locally so the app works offline
    await saveSessionOffline({ ...full, syncedToCloud: 0 })

    // 2. Optimistically update Zustand
    set(state => {
      const existing = state.sessionsByDriver[session.driverId] ?? []
      const deduped = existing.filter(s => s.sessionId !== id)
      return {
        sessionsByDriver: {
          ...state.sessionsByDriver,
          [session.driverId]: [full, ...deduped],
        },
      }
    })

    // 3. Push to Firestore (non-fatal if offline)
    try {
      await cloudSaveSession(familyId, full)
      await updateSessionOffline(id, { syncedToCloud: 1 })
      set(state => ({
        sessionsByDriver: {
          ...state.sessionsByDriver,
          [session.driverId]: (state.sessionsByDriver[session.driverId] ?? []).map(s =>
            s.sessionId === id ? { ...s, syncedToCloud: true } : s
          ),
        },
      }))
    } catch {
      console.warn('Session queued for sync when back online:', id)
    }

    return id
  },

  // ── Update ────────────────────────────────────────────────────────────────
  //
  // Write the full updated session to Dexie (syncedToCloud: 0), update
  // Zustand, then attempt Firestore. If offline, sync.js will re-upload
  // the full Dexie record via cloudSaveSession on reconnect.

  updateSession: async (familyId, sessionId, driverId, updates) => {
    // Mark unsynced in Dexie
    await updateSessionOffline(sessionId, { ...updates, syncedToCloud: 0 })

    // Optimistic Zustand update
    set(state => {
      const existing = state.sessionsByDriver[driverId] ?? []
      return {
        sessionsByDriver: {
          ...state.sessionsByDriver,
          [driverId]: existing.map(s =>
            s.sessionId === sessionId ? { ...s, ...updates, syncedToCloud: false } : s
          ),
        },
      }
    })

    // Push to Firestore (non-fatal if offline)
    try {
      await cloudUpdateSession(familyId, sessionId, updates)
      await updateSessionOffline(sessionId, { syncedToCloud: 1 })
      set(state => ({
        sessionsByDriver: {
          ...state.sessionsByDriver,
          [driverId]: (state.sessionsByDriver[driverId] ?? []).map(s =>
            s.sessionId === sessionId ? { ...s, syncedToCloud: true } : s
          ),
        },
      }))
    } catch {
      console.warn('Session update queued for sync when back online:', sessionId)
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  //
  // Deletes require Firestore to be reachable — we can't queue deletions
  // for later without a dedicated tombstone mechanism. If offline this
  // throws, and the calling screen will show a toast error.

  deleteSession: async (familyId, sessionId, driverId) => {
    await cloudDeleteSession(familyId, sessionId)
    await deleteSessionOffline(sessionId)

    set(state => ({
      sessionsByDriver: {
        ...state.sessionsByDriver,
        [driverId]: (state.sessionsByDriver[driverId] ?? []).filter(
          s => s.sessionId !== sessionId
        ),
      },
    }))
  },

  // ── Selectors ──────────────────────────────────────────────────────────────

  getSessionsForDriver: (driverId) => {
    return get().sessionsByDriver[driverId] ?? []
  },

  // ── Live session ───────────────────────────────────────────────────────────

  startActiveSession: (sessionData) => set({ activeSession: sessionData }),
  updateActiveSession: (updates) =>
    set(state => ({
      activeSession: state.activeSession ? { ...state.activeSession, ...updates } : null,
    })),
  clearActiveSession: () => set({ activeSession: null }),
}))

export default useSessionStore
