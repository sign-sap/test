import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Permissions
  const permissions = [
    { key: 'submissions:read:own', description: 'Read own submissions' },
    { key: 'submissions:read:all', description: 'Read all submissions' },
    { key: 'submissions:create', description: 'Create submissions' },
    { key: 'submissions:update:own', description: 'Update own submissions' },
    { key: 'submissions:update:all', description: 'Update all submissions' },
    { key: 'submissions:review', description: 'Review submissions' },
    { key: 'submissions:approve', description: 'Approve submissions' },
    { key: 'submissions:reject', description: 'Reject submissions' },
    { key: 'submissions:archive', description: 'Archive submissions' },
    { key: 'users:manage', description: 'Manage users' },
    { key: 'roles:manage', description: 'Manage roles' },
    { key: 'audit:read', description: 'Read audit logs' },
    { key: 'initiatives:create', description: 'Create initiatives' },
  ]

  const createdPermissions: Record<string, any> = {}
  for (const perm of permissions) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    })
    createdPermissions[perm.key] = created
  }

  // Roles
  const ownerRole = await prisma.role.upsert({
    where: { name: 'Owner' },
    update: {},
    create: { name: 'Owner', description: 'Full system access' },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Administrative access' },
  })

  const reviewerRole = await prisma.role.upsert({
    where: { name: 'Reviewer' },
    update: {},
    create: { name: 'Reviewer', description: 'Can review and approve submissions' },
  })

  const submitterRole = await prisma.role.upsert({
    where: { name: 'Submitter' },
    update: {},
    create: { name: 'Submitter', description: 'Can create and manage own submissions' },
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: { name: 'Viewer', description: 'Read-only access' },
  })

  // Role permissions
  const rolePermissionMap: Record<string, string[]> = {
    Owner: Object.keys(createdPermissions),
    Admin: [
      'users:manage',
      'roles:manage',
      'submissions:read:all',
      'audit:read',
      'initiatives:create',
      'submissions:archive',
      'submissions:review',
      'submissions:approve',
      'submissions:reject',
    ],
    Reviewer: [
      'submissions:read:all',
      'submissions:review',
      'submissions:approve',
      'submissions:reject',
      'initiatives:create',
    ],
    Submitter: [
      'submissions:create',
      'submissions:read:own',
      'submissions:update:own',
    ],
    Viewer: ['submissions:read:all'],
  }

  for (const [roleName, permKeys] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) continue

    for (const permKey of permKeys) {
      const perm = createdPermissions[permKey]
      if (!perm) continue

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      })
    }
  }

  // Create owner user
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@innovationportal.com'
  const ownerUser = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'System Owner',
      profileCompleted: true,
    },
  })

  // Assign Owner role to owner user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: ownerUser.id,
      roleId: ownerRole.id,
    },
  })

  console.log('Database seeded successfully!')
  console.log(`Owner user: ${ownerEmail}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
