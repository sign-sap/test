import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdminOrReviewer } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const approveSchema = z.object({
  comment: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdminOrReviewer()

    const body = await request.json()
    const result = approveSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Comment is required', result.error.errors),
        { status: 400 }
      )
    }

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Submission not found'),
        { status: 404 }
      )
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvalComment: result.data.comment,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    await prisma.comment.create({
      data: {
        submissionId: params.id,
        authorId: user.id,
        body: `Approved: ${result.data.comment}`,
      },
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'submission.approve',
      entityType: 'Submission',
      entityId: params.id,
      userId: user.id,
      success: true,
      metadata: {
        fromStatus: submission.status,
        toStatus: 'APPROVED',
        comment: result.data.comment,
      },
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
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin or reviewer access required'),
          { status: 403 }
        )
      }
    }

    console.error('Approve submission error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
