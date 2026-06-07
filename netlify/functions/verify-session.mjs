import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function adminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

function parseCookies(header) {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const idx = c.indexOf('=')
      return idx < 0 ? [c.trim(), ''] : [c.slice(0, idx).trim(), c.slice(idx + 1).trim()]
    })
  )
}

const CLEAR_COOKIE = '__session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict'

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const cookies = parseCookies(event.headers.cookie)
    const sessionCookie = cookies['__session']
    if (!sessionCookie) {
      return { statusCode: 401, body: JSON.stringify({ error: 'no-cookie' }) }
    }

    adminApp()
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true)
    const customToken = await getAuth().createCustomToken(decoded.uid)

    return {
      statusCode: 200,
      body: JSON.stringify({ customToken }),
    }
  } catch (err) {
    console.error('verify-session:', err.message)
    return {
      statusCode: 401,
      headers: { 'Set-Cookie': CLEAR_COOKIE },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
