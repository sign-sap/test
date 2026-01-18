import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const updateInitiativeSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        updates: {
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
        },
        kpis: true,
      },
    })

    if (!initiative) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Initiative not found'),
        { status: 404 }
      )
    }

    return NextResponse.json(successResponse(initiative))
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

    console.error('Get initiative error:', error)
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
    const user = await requireAdmin()

    const body = await request.json()
    const result = updateInitiativeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid initiative data', result.error.errors),
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

    const updateData: any = {}
    if (result.data.title) updateData.title = result.data.title
    if (result.data.description) updateData.description = result.data.description
    if (result.data.category !== undefined) updateData.category = result.data.category
    if (result.data.department !== undefined) updateData.department = result.data.department
    if (result.data.status) updateData.status = result.data.status
    if (result.data.progressPercent !== undefined) updateData.progressPercent = result.data.progressPercent
    if (result.data.startDate) updateData.startDate = new Date(result.data.startDate)
    if (result.data.endDate) updateData.endDate = new Date(result.data.endDate)

    const updated = await prisma.initiative.update({
      where: { id: params.id },
      data: updateData,
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
      action: 'initiative.update',
      entityType: 'Initiative',
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
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin access required'),
          { status: 403 }
        )
      }
    }

    console.error('Update initiative error:', error)
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
    const user = await requireAdmin()

    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
    })

    if (!initiative) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Initiative not found'),
        { status: 404 }
      )
    }

    await prisma.initiative.delete({
      where: { id: params.id },
    })

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'initiative.delete',
      entityType: 'Initiative',
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
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin access required'),
          { status: 403 }
        )
      }
    }

    console.error('Delete initiative error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
