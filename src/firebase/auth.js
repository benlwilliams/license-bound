import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { app } from './config'

export const auth = getAuth(app)
export { setPersistence, browserLocalPersistence }

// Default to LOCAL persistence so users stay logged in across sessions
setPersistence(auth, browserLocalPersistence)

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
