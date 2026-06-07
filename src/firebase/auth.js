import {
  initializeAuth,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { app } from './config'

// IndexedDB persistence has silent failures in iOS standalone PWA mode.
// Use localStorage as the primary store — it survives force-quits reliably.
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence],
})

export { setPersistence, signInWithCustomToken, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence }

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  // Clear server-side session cookie so iOS can't restore a stale session
  fetch('/.netlify/functions/delete-session', { method: 'POST', credentials: 'include' }).catch(() => {})
  return firebaseSignOut(auth)
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
