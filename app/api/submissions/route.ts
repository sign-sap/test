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
  invalidInput,
} from '@/lib/errors'

const createSubmissionSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const canReadAll = await hasPermission(user.id, 'submissions:read:all')

    const submissions = await prisma.submission.findMany({
      where: canReadAll ? {} : { createdById: user.id },
      include: {
        createdBy: {
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      const err = unauthorized()
      return NextResponse.json(errorResponse(err), { status: err.status })
    }

    const err = new ApiError('INTERNAL_ERROR', 'Internal server error', 500)
    return NextResponse.json(errorResponse(err), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const canCreate = await hasPermission(user.id, 'submissions:create')
    if (!canCreate) {
      throw forbidden('You do not have permission to create submissions')
    }

    const body = await request.json()
    const result = createSubmissionSchema.safeParse(body)

    if (!result.success) {
      throw invalidInput('Invalid submission data', result.error.errors)
    }

    const { title, description } = result.data

    const submission = await prisma.submission.create({
      data: {
        title,
        description,
        status: 'DRAFT',
        createdById: user.id,
      },
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
      action: 'submission.create',
      entityType: 'submission',
      entityId: submission.id,
      userId: user.id,
      success: true,
      metadata: { title, status: submission.status },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(submission), { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      const err = unauthorized()
      return NextResponse.json(errorResponse(err), { status: err.status })
    }

    if (error instanceof ApiError) {
      return NextResponse.json(errorResponse(error), { status: error.status })
    }

    console.error('Create submission error:', error)
    const err = new ApiError('INTERNAL_ERROR', 'Internal server error', 500)
    return NextResponse.json(errorResponse(err), { status: 500 })
  }
}
