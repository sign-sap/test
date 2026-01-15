import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { generateOtp, hashToken, getOtpExpiry } from '@/lib/crypto'
import { sendOtpEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthEvent } from '@/lib/audit'
import { isEmailAllowed } from '@/lib/email-policy'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = requestSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid email format'),
        { status: 400 }
      )
    }
    
    const { email } = result.data
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    if (!isEmailAllowed(email)) {
      await logAuthEvent({
        action: 'OTP_REQUESTED',
        email,
        success: false,
        ip,
        userAgent,
      })
      
      return NextResponse.json(
        errorResponse(ErrorCodes.EMAIL_NOT_ALLOWED, 'Email not allowed'),
        { status: 403 }
      )
    }
    
    const emailRateLimit = await checkRateLimit(email, 'email', 'otp:request')
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Too many OTP requests. Please try again later.',
          { resetAt: emailRateLimit.resetAt }
        ),
        { status: 429 }
      )
    }
    
    const ipRateLimit = await checkRateLimit(ip, 'ip', 'otp:request')
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Too many requests from this IP. Please try again later.',
          { resetAt: ipRateLimit.resetAt }
        ),
        { status: 429 }
      )
    }
    
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: { email },
      })
    }
    
    const otp = generateOtp()
    const tokenHash = hashToken(otp)
    const expiresAt = getOtpExpiry()
    
    await prisma.otpToken.deleteMany({
      where: { email },
    })
    
    await prisma.otpToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    })
    
    await sendOtpEmail(email, otp)
    
    await logAuthEvent({
      action: 'OTP_REQUESTED',
      email,
      userId: user.id,
      success: true,
      ip,
      userAgent,
    })
    
    return NextResponse.json(successResponse())
  } catch (error) {
    console.error('Request OTP error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
