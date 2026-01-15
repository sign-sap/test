import { cookies } from 'next/headers'
import prisma from './prisma'
import { generateSessionToken, getSessionExpiry } from './crypto'

const SESSION_COOKIE_NAME = 'innovation_session'

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = getSessionExpiry()
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })
  
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
  
  return token
}

export async function getSessionUser() {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) {
    return null
  }
  
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } })
    }
    return null
  }
  
  return session.user
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
  }
  
  cookieStore.delete(SESSION_COOKIE_NAME)
}
