import prisma from './prisma'

interface RateLimitConfig {
  maxAttempts: number
  windowMinutes: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'otp:request:email': { maxAttempts: 3, windowMinutes: 15 },
  'otp:request:ip': { maxAttempts: 10, windowMinutes: 15 },
  'otp:verify:email': { maxAttempts: 5, windowMinutes: 15 },
}

export async function checkRateLimit(
  identifier: string,
  type: 'email' | 'ip',
  endpoint: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const key = `${endpoint}:${type}`
  const config = RATE_LIMITS[key]
  
  if (!config) {
    return { allowed: true }
  }
  
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000)
  
  const rateLimit = await prisma.rateLimit.findUnique({
    where: {
      identifier_type_endpoint: {
        identifier,
        type,
        endpoint,
      },
    },
  })
  
  if (!rateLimit || rateLimit.expiresAt < now) {
    const expiresAt = new Date(now.getTime() + config.windowMinutes * 60 * 1000)
    
    if (rateLimit) {
      await prisma.rateLimit.delete({ where: { id: rateLimit.id } })
    }
    
    await prisma.rateLimit.create({
      data: {
        identifier,
        type,
        endpoint,
        count: 1,
        expiresAt,
      },
    })
    
    return { allowed: true }
  }
  
  if (rateLimit.count >= config.maxAttempts) {
    return { allowed: false, resetAt: rateLimit.expiresAt }
  }
  
  await prisma.rateLimit.update({
    where: { id: rateLimit.id },
    data: { count: rateLimit.count + 1 },
  })
  
  return { allowed: true }
}
