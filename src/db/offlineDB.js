import Dexie from 'dexie'

export const db = new Dexie('LicenseBound')

db.version(1).stores({
  // sessionId is the primary key; indexed fields listed after
  sessions: 'sessionId, driverId, date, logType, syncedToCloud',
  drivers: 'id, familyId',
  supervisors: 'id, familyId',
})

// ── Session helpers ────────────────────────────────────────────────────────────

export async function saveSessionOffline(session) {
  await db.sessions.put({
    ...session,
    // Dexie indexes booleans as 0/1 for where() queries
    syncedToCloud: session.syncedToCloud ? 1 : 0,
  })
}

export async function getSessionsOffline(driverId) {
  const sessions = await db.sessions
    .where('driverId').equals(driverId)
    .reverse()
    .sortBy('date')
  // Restore boolean
  return sessions.map(s => ({ ...s, syncedToCloud: s.syncedToCloud === 1 }))
}

export async function deleteSessionOffline(sessionId) {
  await db.sessions.delete(sessionId)
}

export async function updateSessionOffline(sessionId, updates) {
  await db.sessions.update(sessionId, updates)
}

// ── Driver helpers ─────────────────────────────────────────────────────────────

export async function saveDriverOffline(driver) {
  await db.drivers.put(driver)
}

export async function getDriversOffline(familyId) {
  return db.drivers.where('familyId').equals(familyId).toArray()
}

export async function deleteDriverOffline(driverId) {
  await db.drivers.delete(driverId)
}

// ── Supervisor helpers ─────────────────────────────────────────────────────────

export async function saveSupervisorOffline(supervisor) {
  await db.supervisors.put(supervisor)
}

export async function getSupervisorsOffline(familyId) {
  return db.supervisors.where('familyId').equals(familyId).toArray()
}

export async function deleteSupervisorOffline(supervisorId) {
  await db.supervisors.delete(supervisorId)
}
