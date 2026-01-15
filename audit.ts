import prisma from './prisma'

export async function logAuthEvent(params: {
  action: string
  email?: string
  userId?: string
  success: boolean
  ip?: string
  userAgent?: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      email: params.email,
      userId: params.userId,
      success: params.success,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  })
}
