import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './config'

const fns = getFunctions(app)

// Timeout is set to 120s to match the Cloud Function's timeoutSeconds setting.
// The default httpsCallable timeout is 70s, which would cut off slow vision
// analysis calls before the function completes.
export const parseLogImage = httpsCallable(fns, 'parseLogImage', { timeout: 120000 })
