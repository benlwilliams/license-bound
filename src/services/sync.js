import { db as offlineDB } from '@/db/offlineDB'
import { saveSession as cloudSaveSession } from '@/firebase/firestore'

/**
 * Syncs any offline-only sessions (syncedToCloud === false) to Firestore.
 * Called when the device comes back online.
 *
 * @param {string} familyId
 */
export async function syncPendingSessions(familyId) {
  if (!familyId) return

  try {
    const pending = await offlineDB.sessions
      .where('syncedToCloud').equals(0) // Dexie stores booleans as 0/1
      .toArray()

    for (const session of pending) {
      try {
        await cloudSaveSession(familyId, session)
        await offlineDB.sessions.update(session.sessionId, { syncedToCloud: 1 })
      } catch (err) {
        console.warn('Failed to sync session:', session.sessionId, err)
      }
    }
  } catch (err) {
    console.error('Sync error:', err)
  }
}
