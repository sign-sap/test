import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

const updateKPIsSchema = z.object({
  kpis: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      target: z.number(),
      unit: z.string(),
    })
  ),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const kpis = await prisma.initiativeKPI.findMany({
      where: { initiativeId: params.id },
    })

    return NextResponse.json(successResponse(kpis))
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

    console.error('List KPIs error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const result = updateKPIsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid KPI data', result.error.errors),
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

    await prisma.initiativeKPI.deleteMany({
      where: { initiativeId: params.id },
    })

    const kpis = await prisma.$transaction(
      result.data.kpis.map((kpi) =>
        prisma.initiativeKPI.create({
          data: {
            initiativeId: params.id,
            name: kpi.name,
            value: kpi.value,
            target: kpi.target,
            unit: kpi.unit,
          },
        })
      )
    )

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'initiative.kpis.update',
      entityType: 'Initiative',
      entityId: params.id,
      userId: user.id,
      success: true,
      metadata: { kpisCount: kpis.length },
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(kpis))
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

    console.error('Update KPIs error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
