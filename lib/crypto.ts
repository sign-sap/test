import crypto from 'crypto'

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(hash)
  )
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function getOtpExpiry(): Date {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
  return new Date(Date.now() + minutes * 60 * 1000)
}

export function getSessionExpiry(): Date {
  const days = parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10)
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
