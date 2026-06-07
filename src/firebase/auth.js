import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { app } from './config'

export const auth = getAuth(app)
export { setPersistence, indexedDBLocalPersistence, browserLocalPersistence }

// Request persistent storage from the browser (prevents iOS from clearing PWA data)
navigator.storage?.persist?.()

// Use IndexedDB persistence — more reliable than localStorage for PWAs on iOS
setPersistence(auth, indexedDBLocalPersistence)

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signOut() {
  return firebaseSignOut(auth)
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
