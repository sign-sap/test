import { getSessionUser } from './session'

export async function requireAuth() {
  const user = await getSessionUser()
  
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  
  return user
}

export { getSessionUser }
