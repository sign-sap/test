import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes, getErrorStatus } from '@/lib/errors'

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const canReadAll = await hasPermission(user.id, 'submissions:read:all')
    
    const submissions = await prisma.submission.findMany({
      where: canReadAll ? {} : { ownerId: user.id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(successResponse(submissions))
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
          { status: 401 }
        )
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Permission denied'),
          { status: 403 }
        )
      }
    }

    console.error('List submissions error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const canCreate = await hasPermission(user.id, 'submissions:create')
    if (!canCreate) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      await logDomainEvent({
        action: 'submission.create',
        entityType: 'submission',
        entityId: 'unknown',
        userId: user.id,
        success: false,
        metadata: { reason: 'permission_denied' },
        ip,
        userAgent,
      })

      throw new Error('FORBIDDEN')
    }

    const body = await request.json()
    const result = createSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid submission data', result.error.errors),
        { status: 400 }
      )
    }

    const { title, description } = result.data

    const submission = await prisma.submission.create({
      data: {
        title,
        description,
        ownerId: user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'submission.create',
      entityType: 'submission',
      entityId: submission.id,
      userId: user.id,
      success: true,
      metadata: { title },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(submission), { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
          { status: 401 }
        )
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          errorResponse(ErrorCodes.FORBIDDEN, 'Permission denied'),
          { status: 403 }
        )
      }
    }

    console.error('Create submission error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
