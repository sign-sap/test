import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const updateSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
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

    if (!submission) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Submission not found'),
        { status: 404 }
      )
    }

    const canReadAll = await hasPermission(user.id, 'submissions:read:all')
    const canReadOwn = await hasPermission(user.id, 'submissions:read:own', {
      ownerId: submission.ownerId,
    })

    if (!canReadAll && !canReadOwn) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      await logDomainEvent({
        action: 'submission.read',
        entityType: 'submission',
        entityId: params.id,
        userId: user.id,
        success: false,
        metadata: { reason: 'permission_denied' },
        ip,
        userAgent,
      })

      throw new Error('FORBIDDEN')
    }

    return NextResponse.json(successResponse(submission))
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

    console.error('Get submission error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Submission not found'),
        { status: 404 }
      )
    }

    const canUpdateAll = await hasPermission(user.id, 'submissions:update:all')
    const canUpdateOwn = await hasPermission(user.id, 'submissions:update:own', {
      ownerId: submission.ownerId,
    })

    if (!canUpdateAll && !canUpdateOwn) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      await logDomainEvent({
        action: 'submission.update',
        entityType: 'submission',
        entityId: params.id,
        userId: user.id,
        success: false,
        metadata: { reason: 'permission_denied' },
        ip,
        userAgent,
      })

      throw new Error('FORBIDDEN')
    }

    const body = await request.json()
    const result = updateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid submission data', result.error.errors),
        { status: 400 }
      )
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: result.data,
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
      action: 'submission.update',
      entityType: 'submission',
      entityId: params.id,
      userId: user.id,
      success: true,
      metadata: { changes: result.data },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(updated))
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

    console.error('Update submission error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Submission not found'),
        { status: 404 }
      )
    }

    const canDeleteAll = await hasPermission(user.id, 'submissions:delete:all')
    const canDeleteOwn = await hasPermission(user.id, 'submissions:delete:own', {
      ownerId: submission.ownerId,
    })

    if (!canDeleteAll && !canDeleteOwn) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      await logDomainEvent({
        action: 'submission.delete',
        entityType: 'submission',
        entityId: params.id,
        userId: user.id,
        success: false,
        metadata: { reason: 'permission_denied' },
        ip,
        userAgent,
      })

      throw new Error('FORBIDDEN')
    }

    await prisma.submission.delete({
      where: { id: params.id },
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'submission.delete',
      entityType: 'submission',
      entityId: params.id,
      userId: user.id,
      success: true,
      metadata: {},
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse({ deleted: true }))
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

    console.error('Delete submission error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
