import { getSessionUser } from './session'
import prisma from './prisma'

export async function requireAdmin() {
  const user = await getSessionUser()
  
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: {
      role: true,
    },
  })

  const roleNames = userRoles.map((ur) => ur.role.name)
  const isAdmin = roleNames.includes('owner') || roleNames.includes('admin')

  if (!isAdmin) {
    throw new Error('FORBIDDEN')
  }

  return user
}

export async function requireAdminOrReviewer() {
  const user = await getSessionUser()
  
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: {
      role: true,
    },
  })

  const roleNames = userRoles.map((ur) => ur.role.name)
  const hasAccess = roleNames.includes('owner') || 
                    roleNames.includes('admin') || 
                    roleNames.includes('reviewer')

  if (!hasAccess) {
    throw new Error('FORBIDDEN')
  }

  return user
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  })

  return userRoles.map((ur) => ur.role.name)
}
