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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const { idToken } = JSON.parse(event.body ?? '{}')
    if (!idToken) return { statusCode: 400, body: 'Missing idToken' }

    adminApp()
    const expiresIn = 14 * 24 * 60 * 60 * 1000 // 14 days ms
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn })
    const maxAge = expiresIn / 1000

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `__session=${sessionCookie}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      },
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('create-session:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
