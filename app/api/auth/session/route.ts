import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/errors'

export async function GET() {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json(
        successResponse({ user: null })
      )
    }
    
    return NextResponse.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileCompleted: user.profileCompleted,
        },
      })
    )
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
