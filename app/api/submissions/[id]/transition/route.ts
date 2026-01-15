import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getValidActions, applyTransition } from '@/lib/state-machine'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes, getErrorStatus } from '@/lib/errors'

const transitionSchema = z.object({
  action: z.string(),
  comment: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function GET(
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

    const validActions = await getValidActions({
      submission,
      userId: user.id,
    })

    return NextResponse.json(
      successResponse({
        status: submission.status,
        validActions,
      })
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
        { status: 401 }
      )
    }

    console.error('Get valid actions error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body = await request.json()
    const result = transitionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid transition data', result.error.errors),
        { status: 400 }
      )
    }

    const { action, comment, metadata } = result.data

    const transitionResult = await applyTransition({
      submission,
      userId: user.id,
      action,
      comment,
      metadata,
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (!transitionResult.success) {
      await logDomainEvent({
        action: 'submission.transition',
        entityType: 'Submission',
        entityId: submission.id,
        userId: user.id,
        success: false,
        metadata: {
          actionAttempted: action,
          fromStatus: submission.status,
          commentPresent: !!comment,
          error: transitionResult.error,
        },
        ip,
        userAgent,
      })

      const errorCode = transitionResult.error?.code || ErrorCodes.INTERNAL_ERROR
      const status = getErrorStatus(errorCode)

      return NextResponse.json(
        errorResponse(
          errorCode,
          transitionResult.error?.message || 'Transition failed',
          transitionResult.error?.details
        ),
        { status }
      )
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: transitionResult.newStatus!,
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

    if (comment) {
      await prisma.comment.create({
        data: {
          submissionId: params.id,
          authorId: user.id,
          body: comment,
        },
      })
    }

    await logDomainEvent({
      action: 'submission.transition',
      entityType: 'Submission',
      entityId: submission.id,
      userId: user.id,
      success: true,
      metadata: {
        actionAttempted: action,
        fromStatus: submission.status,
        toStatus: transitionResult.newStatus,
        commentPresent: !!comment,
        ...metadata,
      },
      ip,
      userAgent,
    })

    const validActions = await getValidActions({
      submission: updatedSubmission,
      userId: user.id,
    })

    return NextResponse.json(
      successResponse({
        submission: updatedSubmission,
        validActions,
      })
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
        { status: 401 }
      )
    }

    console.error('Transition error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
