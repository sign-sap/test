import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const createUpdateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const updates = await prisma.initiativeProgressUpdate.findMany({
      where: { initiativeId: params.id },
      include: {
        author: {
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

    return NextResponse.json(successResponse(updates))
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
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin access required'),
          { status: 403 }
        )
      }
    }

    console.error('List updates error:', error)
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
    const user = await requireAdmin()

    const body = await request.json()
    const result = createUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid update data', result.error.errors),
        { status: 400 }
      )
    }

    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
    })

    if (!initiative) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Initiative not found'),
        { status: 404 }
      )
    }

    const update = await prisma.initiativeProgressUpdate.create({
      data: {
        initiativeId: params.id,
        authorId: user.id,
        title: result.data.title,
        description: result.data.description,
      },
      include: {
        author: {
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
      action: 'initiative.update.create',
      entityType: 'InitiativeProgressUpdate',
      entityId: update.id,
      userId: user.id,
      success: true,
      metadata: { initiativeId: params.id, title: update.title },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(update), { status: 201 })
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
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin access required'),
          { status: 403 }
        )
      }
    }

    console.error('Create update error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
