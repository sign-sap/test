import prisma from './prisma'

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const permissions = new Set<string>()
  
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.key)
    }
  }

  return permissions
}

export async function hasPermission(
  userId: string,
  permissionKey: string,
  context?: { ownerId?: string }
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  if (permissions.has(permissionKey)) {
    return true
  }

  if (permissionKey.endsWith(':own') && context?.ownerId) {
    if (userId !== context.ownerId) {
      return false
    }
    return permissions.has(permissionKey)
  }

  if (permissionKey.endsWith(':own')) {
    const allPermission = permissionKey.replace(':own', ':all')
    if (permissions.has(allPermission)) {
      return true
    }
  }

  return false
}

export async function requirePermission(
  userId: string,
  permissionKey: string,
  context?: { ownerId?: string }
): Promise<void> {
  const allowed = await hasPermission(userId, permissionKey, context)
  
  if (!allowed) {
    throw new Error('FORBIDDEN')
  }
}
