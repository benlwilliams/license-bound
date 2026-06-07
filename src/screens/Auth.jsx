import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, signIn, signUp, resetPassword, setPersistence, browserSessionPersistence } from '@/firebase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Car, Fingerprint } from 'lucide-react'

const CRED_API = typeof window !== 'undefined' && 'PasswordCredential' in window
const EMAIL_KEY = 'lb_email'

async function createServerSession(user) {
  try {
    const idToken = await user.getIdToken()
    await fetch('/.netlify/functions/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
  } catch {
    // Non-fatal: Firebase Auth still works, cookie is just a backup
  }
}

export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  // Check silently for saved credentials on sign-in screen (Android Chrome only)
  useEffect(() => {
    if (mode !== 'signin' || !CRED_API) return
    navigator.credentials.get({ password: true, mediation: 'silent' })
      .then(cred => { if (cred) setBiometricAvailable(true) })
      .catch(() => {})
  }, [mode])

  async function handleBiometricLogin() {
    if (!CRED_API) return
    setLoading(true)
    setError('')
    try {
      const cred = await navigator.credentials.get({ password: true, mediation: 'required' })
      if (cred) {
        const { user } = await signIn(cred.id, cred.password)
        localStorage.setItem(EMAIL_KEY, cred.id)
        await createServerSession(user)
        navigate('/')
      }
    } catch {
      setError('Biometric login failed. Please sign in with your password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        // Only switch to session-only storage when the user explicitly unchecks remember me
        if (!rememberMe) await setPersistence(auth, browserSessionPersistence)

        const { user } = await signIn(email, password)

        if (rememberMe) {
          localStorage.setItem(EMAIL_KEY, email)
          await createServerSession(user)
        }

        if (rememberMe && CRED_API) {
          try {
            const cred = new window.PasswordCredential({ id: email, password })
            await navigator.credentials.store(cred)
          } catch {}
        }

        navigate('/')
      } else if (mode === 'signup') {
        const { user } = await signUp(email, password)
        localStorage.setItem(EMAIL_KEY, email)
        await createServerSession(user)
        navigate('/')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setResetSent(true)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="bg-primary text-primary-foreground rounded-2xl p-3">
            <Car size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LicenseBound</h1>
          <p className="text-muted-foreground text-sm text-center">
            Track supervised driving hours for the Texas GDL program
          </p>
        </div>

        {/* Biometric login button — only shown when saved credentials exist */}
        {mode === 'signin' && biometricAvailable && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleBiometricLogin}
            disabled={loading}
          >
            <Fingerprint size={18} />
            Sign in with Face ID / Fingerprint
          </Button>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === 'signin' && 'Sign in to your family account'}
              {mode === 'signup' && 'Create your family account'}
              {mode === 'reset' && 'Reset your password'}
            </CardTitle>
            {mode === 'signup' && (
              <CardDescription>One account per family. Share with your teen as needed.</CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {resetSent ? (
              <div className="text-sm text-center space-y-3">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Check your inbox — a reset link is on its way.
                </p>
                <Button variant="ghost" onClick={() => { setMode('signin'); setResetSent(false) }}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="parent@example.com"
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {/* Remember me — only on sign-in */}
                {mode === 'signin' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait…' : (
                    mode === 'signin' ? 'Sign in' :
                    mode === 'signup' ? 'Create account' :
                    'Send reset link'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground space-y-1 pt-1">
                  {mode === 'signin' && (
                    <>
                      <button type="button" onClick={() => setMode('signup')} className="block w-full hover:text-foreground transition-colors">
                        New family? Create an account
                      </button>
                      <button type="button" onClick={() => setMode('reset')} className="block w-full hover:text-foreground transition-colors">
                        Forgot password?
                      </button>
                    </>
                  )}
                  {(mode === 'signup' || mode === 'reset') && (
                    <button type="button" onClick={() => setMode('signin')} className="hover:text-foreground transition-colors">
                      Back to sign in
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again in a few minutes.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
