import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { logDomainEvent } from '@/lib/audit'
import {
  ApiError,
  errorResponse,
  successResponse,
  unauthorized,
  forbidden,
  notFound,
  invalidInput,
} from '@/lib/errors'

const updateSubmissionSchema = z.object({
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!submission) {
      throw notFound('Submission not found')
    }

    const canReadAll = await hasPermission(user.id, 'submissions:read:all')
    const canReadOwn = await hasPermission(user.id, 'submissions:read:own', {
      resourceOwnerId: submission.createdById,
    })

    if (!canReadAll && !canReadOwn) {
      throw forbidden('You do not have permission to read this submission')
    }

    return NextResponse.json(successResponse(submission))
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      const err = unauthorized()
      return NextResponse.json(errorResponse(err), { status: err.status })
    }

    if (error instanceof ApiError) {
      return NextResponse.json(errorResponse(error), { status: error.status })
    }

    const err = new ApiError('INTERNAL_ERROR', 'Internal server error', 500)
    return NextResponse.json(errorResponse(err), { status: 500 })
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
      throw notFound('Submission not found')
    }

    // Only allow updates in DRAFT or NEED_INFO status
    if (submission.status !== 'DRAFT' && submission.status !== 'NEED_INFO') {
      throw forbidden('Submission cannot be updated in its current status')
    }

    const canUpdateAll = await hasPermission(user.id, 'submissions:update:all')
    const canUpdateOwn = await hasPermission(user.id, 'submissions:update:own', {
      resourceOwnerId: submission.createdById,
    })

    if (!canUpdateAll && !canUpdateOwn) {
      throw forbidden('You do not have permission to update this submission')
    }

    const body = await request.json()
    const result = updateSubmissionSchema.safeParse(body)

    if (!result.success) {
      throw invalidInput('Invalid submission data', result.error.errors)
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: result.data,
      include: {
        createdBy: {
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
      entityId: updated.id,
      userId: user.id,
      success: true,
      metadata: { changes: result.data },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      const err = unauthorized()
      return NextResponse.json(errorResponse(err), { status: err.status })
    }

    if (error instanceof ApiError) {
      return NextResponse.json(errorResponse(error), { status: error.status })
    }

    console.error('Update submission error:', error)
    const err = new ApiError('INTERNAL_ERROR', 'Internal server error', 500)
    return NextResponse.json(errorResponse(err), { status: 500 })
  }
}
