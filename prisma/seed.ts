import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const permissions = [
    { key: 'submissions:create', description: 'Create submissions' },
    { key: 'submissions:read:own', description: 'Read own submissions' },
    { key: 'submissions:read:all', description: 'Read all submissions' },
    { key: 'submissions:update:own', description: 'Update own submissions' },
    { key: 'submissions:update:all', description: 'Update all submissions' },
    { key: 'submissions:delete:own', description: 'Delete own submissions' },
    { key: 'submissions:delete:all', description: 'Delete all submissions' },
    { key: 'submissions:review', description: 'Review submissions' },
    { key: 'submissions:approve', description: 'Approve submissions' },
    { key: 'submissions:reject', description: 'Reject submissions' },
    { key: 'submissions:transition:submit', description: 'Submit submissions' },
    { key: 'submissions:transition:review', description: 'Start review process' },
    { key: 'submissions:transition:need_info', description: 'Request more information' },
    { key: 'submissions:transition:approve', description: 'Approve submissions' },
    { key: 'submissions:transition:reject', description: 'Reject submissions' },
    { key: 'submissions:transition:resubmit', description: 'Resubmit after updates' },
    { key: 'submissions:transition:convert', description: 'Convert to initiative' },
    { key: 'submissions:transition:archive', description: 'Archive submissions' },
    { key: 'users:manage', description: 'Manage users' },
    { key: 'roles:manage', description: 'Manage roles' },
    { key: 'audit:read', description: 'Read audit logs' },
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

  const ownerRole = await prisma.role.upsert({
    where: { name: 'owner' },
    update: {},
    create: {
      name: 'owner',
      description: 'Full system access',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrative access',
    },
  })

  const reviewerRole = await prisma.role.upsert({
    where: { name: 'reviewer' },
    update: {},
    create: {
      name: 'reviewer',
      description: 'Can review and manage submissions',
    },
  })

  const submitterRole = await prisma.role.upsert({
    where: { name: 'submitter' },
    update: {},
    create: {
      name: 'submitter',
      description: 'Can create and manage own submissions',
    },
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Read-only access',
    },
  })

  const rolePermissions: Record<string, string[]> = {
    owner: Object.keys(createdPermissions),
    admin: [
      'submissions:read:all',
      'submissions:update:all',
      'submissions:delete:all',
      'submissions:review',
      'submissions:approve',
      'submissions:reject',
      'submissions:transition:review',
      'submissions:transition:need_info',
      'submissions:transition:approve',
      'submissions:transition:reject',
      'submissions:transition:convert',
      'submissions:transition:archive',
      'users:manage',
      'roles:manage',
      'audit:read',
    ],
    reviewer: [
      'submissions:read:all',
      'submissions:review',
      'submissions:approve',
      'submissions:reject',
      'submissions:transition:review',
      'submissions:transition:need_info',
      'submissions:transition:approve',
      'submissions:transition:reject',
    ],
    submitter: [
      'submissions:create',
      'submissions:read:own',
      'submissions:update:own',
      'submissions:delete:own',
      'submissions:transition:submit',
      'submissions:transition:resubmit',
    ],
    viewer: [
      'submissions:read:all',
    ],
  }

  for (const [roleName, permKeys] of Object.entries(rolePermissions)) {
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
