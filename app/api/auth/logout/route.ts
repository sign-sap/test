import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, destroySession } from '@/lib/session'
import { logAuthEvent } from '@/lib/audit'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    if (user) {
      await logAuthEvent({
        action: 'LOGOUT',
        email: user.email,
        userId: user.id,
        success: true,
        ip,
        userAgent,
      })
    }
    
    await destroySession()
    
    return NextResponse.json(successResponse())
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
