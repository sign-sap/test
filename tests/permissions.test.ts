import { hasPermission, getUserPermissions } from '../lib/permissions'
import prisma from '../lib/prisma'

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    userRole: {
      findMany: jest.fn(),
    },
  },
}))

describe('Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true for exact permission match', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  key: 'submissions:create',
                },
              },
            ],
          },
        },
      ]

      ;(prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles)

      const result = await hasPermission('user123', 'submissions:create')
      expect(result).toBe(true)
    })

    it('should return false when permission not found', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  key: 'submissions:read:own',
                },
              },
            ],
          },
        },
      ]

      ;(prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles)

      const result = await hasPermission('user123', 'submissions:create')
      expect(result).toBe(false)
    })

    it('should check ownership for :own permissions', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  key: 'submissions:read:own',
                },
              },
            ],
          },
        },
      ]

      ;(prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles)

      const resultOwner = await hasPermission('user123', 'submissions:read:own', {
        resourceOwnerId: 'user123',
      })
      expect(resultOwner).toBe(true)

      const resultNotOwner = await hasPermission('user123', 'submissions:read:own', {
        resourceOwnerId: 'user456',
      })
      expect(resultNotOwner).toBe(false)
    })

    it('should allow :all permission to grant :own access', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  key: 'submissions:read:all',
                },
              },
            ],
          },
        },
      ]

      ;(prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles)

      const result = await hasPermission('user123', 'submissions:read:own', {
        resourceOwnerId: 'user456',
      })
      expect(result).toBe(true)
    })
  })

  describe('getUserPermissions', () => {
    it('should return all unique permissions from all roles', async () => {
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              { permission: { key: 'submissions:create' } },
              { permission: { key: 'submissions:read:own' } },
            ],
          },
        },
        {
          role: {
            rolePermissions: [
              { permission: { key: 'submissions:read:all' } },
              { permission: { key: 'submissions:create' } },
            ],
          },
        },
      ]

      ;(prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles)

      const permissions = await getUserPermissions('user123')
      expect(permissions).toHaveLength(3)
      expect(permissions).toContain('submissions:create')
      expect(permissions).toContain('submissions:read:own')
      expect(permissions).toContain('submissions:read:all')
    })
  })
})
