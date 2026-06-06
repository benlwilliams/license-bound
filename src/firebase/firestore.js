import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { app } from './config'

export const db = getFirestore(app)

// ── Collection path helpers ───────────────────────────────────────────────────

function familyCol(familyId, sub) {
  return collection(db, 'families', familyId, sub)
}

function familyDoc(familyId, sub, id) {
  return doc(db, 'families', familyId, sub, id)
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export async function getDrivers(familyId) {
  const snap = await getDocs(familyCol(familyId, 'drivers'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveDriver(familyId, driver) {
  const ref = driver.id
    ? familyDoc(familyId, 'drivers', driver.id)
    : doc(familyCol(familyId, 'drivers'))
  await setDoc(ref, { ...driver, id: ref.id, updatedAt: serverTimestamp() }, { merge: true })
  return ref.id
}

export async function deleteDriver(familyId, driverId) {
  await deleteDoc(familyDoc(familyId, 'drivers', driverId))
}

// ── Supervisors ───────────────────────────────────────────────────────────────

export async function getSupervisors(familyId) {
  const snap = await getDocs(familyCol(familyId, 'supervisors'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveSupervisor(familyId, supervisor) {
  const ref = supervisor.id
    ? familyDoc(familyId, 'supervisors', supervisor.id)
    : doc(familyCol(familyId, 'supervisors'))
  await setDoc(ref, { ...supervisor, id: ref.id, updatedAt: serverTimestamp() }, { merge: true })
  return ref.id
}

export async function deleteSupervisor(familyId, supervisorId) {
  await deleteDoc(familyDoc(familyId, 'supervisors', supervisorId))
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getSessions(familyId, driverId) {
  const col = familyCol(familyId, 'sessions')
  const q = driverId
    ? query(col, where('driverId', '==', driverId), orderBy('date', 'desc'))
    : query(col, orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveSession(familyId, session) {
  const ref = session.sessionId
    ? familyDoc(familyId, 'sessions', session.sessionId)
    : doc(familyCol(familyId, 'sessions'))
  const id = ref.id
  await setDoc(ref, { ...session, sessionId: id, syncedToCloud: true }, { merge: true })
  return id
}

export async function updateSession(familyId, sessionId, updates) {
  await updateDoc(familyDoc(familyId, 'sessions', sessionId), {
    ...updates,
    syncedToCloud: true,
  })
}

export async function deleteSession(familyId, sessionId) {
  await deleteDoc(familyDoc(familyId, 'sessions', sessionId))
}
