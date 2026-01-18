import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const createInitiativeSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const department = searchParams.get('department')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) {
      where.status = status
    }
    if (category) {
      where.category = category
    }
    if (department) {
      where.department = department
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const initiatives = await prisma.initiative.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            updates: true,
            kpis: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(successResponse(initiatives))
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

    console.error('List initiatives error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const result = createInitiativeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid initiative data', result.error.errors),
        { status: 400 }
      )
    }

    const initiative = await prisma.initiative.create({
      data: {
        title: result.data.title,
        description: result.data.description,
        category: result.data.category,
        department: result.data.department,
        status: result.data.status || 'PLANNED',
        ownerId: user.id,
        startDate: result.data.startDate ? new Date(result.data.startDate) : null,
        endDate: result.data.endDate ? new Date(result.data.endDate) : null,
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
      action: 'initiative.create',
      entityType: 'Initiative',
      entityId: initiative.id,
      userId: user.id,
      success: true,
      metadata: { title: initiative.title },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(initiative), { status: 201 })
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

    console.error('Create initiative error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
