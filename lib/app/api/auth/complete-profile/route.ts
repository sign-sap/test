import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logAuthEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const profileSchema = z.object({
  name: z.string().min(2).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const result = profileSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid name', result.error.errors),
        { status: 400 }
      )
    }

    const { name } = result.data

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        profileCompleted: true,
      },
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logAuthEvent({
      action: 'PROFILE_COMPLETED',
      email: user.email,
      userId: user.id,
      success: true,
      ip,
      userAgent,
    })

    return NextResponse.json(
      successResponse({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          profileCompleted: updated.profileCompleted,
        },
      })
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
        { status: 401 }
      )
    }

    console.error('Complete profile error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
