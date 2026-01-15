import prisma from './prisma'

export async function getUserPermissions(userId: string): Promise<string[]> {
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
    for (const rolePerm of userRole.role.rolePermissions) {
      permissions.add(rolePerm.permission.key)
    }
  }

  return Array.from(permissions)
}

export async function hasPermission(
  userId: string,
  permissionKey: string,
  context?: { resourceOwnerId?: string }
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  // Check exact match
  if (permissions.includes(permissionKey)) {
    return true
  }

  // Check :own vs :all variants
  if (permissionKey.includes(':own') && context?.resourceOwnerId) {
    // User must be the owner
    if (userId !== context.resourceOwnerId) {
      return false
    }
    // Check if user has :own permission
    return permissions.includes(permissionKey)
  }

  // Check if user has :all permission when :own is requested
  if (permissionKey.includes(':own')) {
    const allPermission = permissionKey.replace(':own', ':all')
    if (permissions.includes(allPermission)) {
      return true
    }
  }

  return false
}

export async function requirePermission(
  userId: string,
  permissionKey: string,
  context?: { resourceOwnerId?: string }
): Promise<void> {
  const allowed = await hasPermission(userId, permissionKey, context)
  if (!allowed) {
    throw new Error('FORBIDDEN')
  }
}
