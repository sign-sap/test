import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getValidActions, applyTransition } from '@/lib/state-machine'
import { logDomainEvent } from '@/lib/audit'
import {
  ApiError,
  errorResponse,
  successResponse,
  unauthorized,
  notFound,
  invalidTransition,
  invalidInput,
} from '@/lib/errors'

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
      throw notFound('Submission not found')
    }

    const validActions = await getValidActions(submission, user)

    return NextResponse.json(successResponse({ validActions }))
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
      throw notFound('Submission not found')
    }

    const body = await request.json()
    const result = transitionSchema.safeParse(body)

    if (!result.success) {
      throw invalidInput('Invalid transition data', result.error.errors)
    }

    const { action, comment, metadata } = result.data

    const transitionResult = await applyTransition(submission, user, action)

    if (!transitionResult.valid) {
      throw invalidTransition(transitionResult.error || 'Invalid transition')
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: { status: transitionResult.newStatus! },
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

    if (comment) {
      await prisma.comment.create({
        data: {
          submissionId: params.id,
          authorId: user.id,
          body: comment,
        },
      })
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'submission.transition',
      entityType: 'submission',
      entityId: updated.id,
      userId: user.id,
      success: true,
      metadata: {
        action,
        fromStatus: submission.status,
        toStatus: updated.status,
        comment,
        ...metadata,
      },
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

    console.error('Transition error:', error)
    const err = new ApiError('INTERNAL_ERROR', 'Internal server error', 500)
    return NextResponse.json(errorResponse(err), { status: 500 })
  }
}
