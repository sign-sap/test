import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/crypto'
import { createSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = verifySchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid email or OTP format'),
        { status: 400 }
      )
    }
    
    const { email, code } = result.data
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    const rateLimit = await checkRateLimit(email, 'email', 'otp:verify')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Too many verification attempts. Please try again later.',
          { resetAt: rateLimit.resetAt }
        ),
        { status: 429 }
      )
    }
    
    const otpToken = await prisma.otpToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    })
    
    if (!otpToken) {
      await logAuthEvent({
        action: 'OTP_VERIFIED',
        email,
        success: false,
        ip,
        userAgent,
      })
      
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_OTP, 'Invalid or expired OTP'),
        { status: 401 }
      )
    }
    
    if (otpToken.expiresAt < new Date()) {
      await logAuthEvent({
        action: 'OTP_VERIFIED',
        email,
        success: false,
        ip,
        userAgent,
      })
      
      return NextResponse.json(
        errorResponse(ErrorCodes.OTP_EXPIRED, 'OTP has expired'),
        { status: 401 }
      )
    }
    
    if (otpToken.attempts >= otpToken.maxAttempts) {
      await logAuthEvent({
        action: 'OTP_VERIFIED',
        email,
        success: false,
        ip,
        userAgent,
      })
      
      return NextResponse.json(
        errorResponse(ErrorCodes.OTP_MAX_ATTEMPTS, 'Maximum verification attempts exceeded'),
        { status: 401 }
      )
    }
    
    const isValid = verifyToken(code, otpToken.tokenHash)
    
    await prisma.otpToken.update({
      where: { id: otpToken.id },
      data: { attempts: otpToken.attempts + 1 },
    })
    
    if (!isValid) {
      await logAuthEvent({
        action: 'OTP_VERIFIED',
        email,
        success: false,
        ip,
        userAgent,
      })
      
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INVALID_OTP,
          'Invalid OTP code',
          { attemptsRemaining: otpToken.maxAttempts - otpToken.attempts - 1 }
        ),
        { status: 401 }
      )
    }
    
    await prisma.otpToken.delete({ where: { id: otpToken.id } })
    
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'User not found'),
        { status: 500 }
      )
    }
    
    await createSession(user.id)
    
    await logAuthEvent({
      action: 'OTP_VERIFIED',
      email,
      userId: user.id,
      success: true,
      ip,
      userAgent,
    })
    
    return NextResponse.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileCompleted: user.profileCompleted,
        },
      })
    )
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
